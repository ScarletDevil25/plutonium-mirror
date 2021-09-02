const env = chrome || browser;

const VERSION = chrome.runtime.getManifest().version;
const DEF_ENABLED = true;
const DEF_MIRROR = 'main';
const DEF_CUSTOM = '';

// Settings Data
const data = {
	version: VERSION,
	enabled: DEF_ENABLED,
	mirror: DEF_MIRROR,
	custom: DEF_CUSTOM
}
// Listen for changes to the extension settings
env.storage.onChanged.addListener(changeSet => {
	for (let key of Object.keys(changeSet)) {
		data[key] = changeSet[key].newValue;
	}
});

// When we are first installed, set the default settings
env.runtime.onInstalled.addListener(() => {
	env.storage.sync.get(async ({ version, enabled, mirror, custom }) => {
		// Ignore if the setting actually do already exist. This happens when reloading the extension.
		if (enabled !== undefined) return;
		data.version = VERSION;
		data.enabled = DEF_ENABLED;
		data.mirror = DEF_MIRROR;
		data.custom = DEF_CUSTOM;
		await env.storage.sync.set(data);
		console.log('Default Settings Configured');
	});
});

// Retrieve the current settings
env.storage.sync.get(({ version, enabled, mirror, custom }) => {
	data.version = version;
	data.enabled = enabled;
	data.mirror = mirror;
	data.custom = custom;
});

// Bind interceptor for redirecting 5e.tools https requests
env.webRequest.onBeforeRequest.addListener(
	function (details) {
		// if we are disabled, return immediately
		if (!data.enabled) return;
		const { mirror, custom } = data;
		// Determine the host URL
		var host = '';
		if (mirror === 'custom') host = custom;
		if (mirror === 'mirror1') host = 'https://5etools-mirror-1.github.io/';
		/* // TODO: If there are any more common mirrors, add them here
		if (mirror === 'mirror#') host = 'https://##.##.##/';
		*/
		else host = 'https://5e.tools/';
		// Ignore links that are already going to our Target Mirror
		if (host === details.url.match(/(^https?:\/\/[^\/]+\/)[\S\s]*/)[1]) return;
		// Redirect to the target mirror host
		return { redirectUrl: host + details.url.match(/^https?:\/\/[^\/]+\/([\S\s]*)/)[1] };
	},
	{
		// We are only going to intercept URLs that match these
		urls: [
			"*://5e.tools/*",
			"*://5etools-mirror-1.github.io/*"
		],
		// We intercept ALL kinds of requests
		types: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
	},
	// We block calls until our handler completes
	["blocking"]
);