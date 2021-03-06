/**
 * Create mappings between the names parsed from useragent to caniuse
 * name equivalents.  We support the caniuse names listed in the
 * `baselineVersion` map below.  This module must return one of these
 * family names, with a version matching the baseline range, for any
 * polyfills to be served.
 *
 * Multiple names may map to the same canonical caniuse family
 */

'use strict';

const useragent = require('useragent');

// Load additional useragent features: primarily to use: agent.satisfies to
// test a browser version against a semver string
require('useragent/features');

// Longest genuine UA seen so far: 255 chars (Facebook in-app on iOS):
const MAX_UA_LEN = 300;

// Use a local LRU cache rather than the one built into useragent, since that cannot be configured
const cache = require('lru-cache')({
	max: 5000
});

const baseLineVersions = {
	"ie": ">=7",
	"ie_mob": ">=8",
	"chrome": "*",
	"safari": ">=4",
	"ios_saf": ">=4",
	"ios_chr": ">=4",
	"firefox": ">=3.6",
	"firefox_mob": ">=4",
	"android": ">=3",
	"opera": ">=11",
	"op_mob": ">=10",
	"op_mini": ">=5",
	"bb": ">=6",
	"samsung_mob": ">=4"
};

/* Aliases may be expressed in three formats:
    1. <detectedfamily>: <targetfamily>
       The browser family is renamed, version is maintained
    2. <detectedfamily>: [<targetfamily>, <targetmajor>, <targetminor>, <targetpatch>]
       The browser family is renamed and the version is set to the one specified
    3. <detectedfamily>: { <semver>: [<targetfamily>, <targetmajor>, <targetminor>, <targetpatch>], ... }
       Specific version ranges of this family are mapped to the specified browsers
	4. <detectedfamily>: <function(uaObj)>
	   The function is called with the parsed UA object, and must return it (but may modify it first)
*/
const aliases = {
	"blackberry webkit": "bb",
	"blackberry": "bb",

	"pale moon (firefox variant)": "firefox",
	"pale moon": "firefox",
	"firefox mobile": "firefox_mob",
	"firefox namoroka": "firefox",
	"firefox shiretoko": "firefox",
	"firefox minefield": "firefox",
	"firefox alpha": "firefox",
	"firefox beta": "firefox",
	"microb": "firefox",
	"mozilladeveloperpreview": "firefox",
	"iceweasel": "firefox",

	"opera tablet": "opera",

	"opera mobile": "op_mob",
	"opera mini": "op_mini",

	"chrome mobile": "chrome",
	"chrome frame": "chrome",
	"chromium": "chrome",
	"headlesschrome": "chrome",

	"ie mobile": "ie_mob",

	"ie large screen": "ie",
	"internet explorer": "ie",
	"edge": "ie",
	"edge mobile": "ie",
	"uc browser": {
		"10": ["uc browser", 0],
		"9.9.*": ["ie", 10]
	},

	"chrome mobile ios": "ios_chr", // comes back as ios_saf

	"mobile safari": "ios_saf",
	"iphone": "ios_saf", // can't find a uastring which useragent returns iphone as family
	"iphone simulator": "ios_saf", // useragent returns either mobile safari or mobile safari uiwebview
	"mobile safari uiwebview": "ios_saf",
	"mobile safari ui/wkwebview": "ios_saf",

	"samsung internet": "samsung_mob",

	"phantomjs": ["safari", 5],

	"yandex browser": {
		"18.9": ["chrome", 68],
		"18.7": ["chrome", 67],
		"18.6": ["chrome", 66],
		"18.5": ["chrome", 65],
		"18.4": ["chrome", 65],
		"18.3": ["chrome", 64],
		"18.2": ["chrome", 63],
		"18.1": ["chrome", 63],
		"17.11": ["chrome", 62],
		"17.10": ["chrome", 61],
		"17.9": ["chrome", 60],
		"17.8": ["chrome", 59],
		"17.7": ["chrome", 59],
		"17.6": ["chrome", 58],
		"17.5": ["chrome", 57],
		"17.4": ["chrome", 57],
		"17.3": ["chrome", 56],
		"17.2": ["chrome", 55],
		"17.1": ["chrome", 55],
		"16.11": ["chrome", 54],
		"16.10": ["chrome", 51],
		"16.9": ["chrome", 51],
		"16.8": ["chrome", 51],
		"16.7": ["chrome", 51],
		"16.6": ["chrome", 50],
		"16.5": ["chrome", 49],
		"16.4": ["chrome", 49],
		"16.3": ["chrome", 47],
		"16.2": ["chrome", 47],
		"16.1": ["chrome", 47],
		"15.12": ["chrome", 46],
		"15.11": ["chrome", 45],
		"15.10": ["chrome", 45],
		"15.9": ["chrome", 44],
		"15.8": ["chrome", 43],
		"15.7": ["chrome", 43],
		"15.6": ["chrome", 42],
		"15.5": ["chrome", 41],
		"15.4": ["chrome", 41],
		"15.3": ["chrome", 40],
		"15.2": ["chrome", 40],
		"15.1": ["chrome", 40],
		"14.10": ["chrome", 37],
		"14.9": ["chrome", 36],
		"14.8": ["chrome", 36],
		"14.7": ["chrome", 35],
		"14.6": ["chrome", 34],
		"14.5": ["chrome", 34],
		"14.4": ["chrome", 33],
		"14.3": ["chrome", 32],
		"14.2": ["chrome", 32],
		"13.12": ["chrome", 30],
		"13.10": ["chrome", 28]
	},

	"opera": {
		"20": ["chrome", 33],
		"21": ["chrome", 34],
		"22": ["chrome", 35],
		"23": ["chrome", 36],
		"24": ["chrome", 37],
		"25": ["chrome", 38],
		"26": ["chrome", 39],
		"27": ["chrome", 40],
		"28": ["chrome", 41],
		"29": ["chrome", 42],
		"30": ["chrome", 43],
		"31": ["chrome", 44],
		"32": ["chrome", 45],
		"33": ["chrome", 46],
		"34": ["chrome", 47],
		"35": ["chrome", 48],
		"36": ["chrome", 49],
		"37": ["chrome", 50],
		"38": ["chrome", 51],
		"39": ["chrome", 52],
		"40": ["chrome", 53],
		"41": ["chrome", 54],
		"42": ["chrome", 55],
		"43": ["chrome", 56],
		"44": ["chrome", 57],
		"45": ["chrome", 58],
		"46": ["chrome", 59],
		"47": ["chrome", 60]
	},

	"googlebot": {
		"2.1": ["chrome", 41]
	}
};

function UA(uaString) {

	// Limit the length of the UA to avoid perf issues in UA parsing
	uaString = uaString.substr(0, MAX_UA_LEN);

	// The longest string that can possibly be a normalized browser name that we
	// support is XXXXXXXXXX/###.###.### (22 chars), so avoid doing the regex if
	// the input string is longer than that
	let normalized = (uaString.length < 22) && uaString.match(/^(\w+)\/(\d+)(?:\.(\d+)(?:\.(\d+))?)?$/i);
	if (!normalized) {
		normalized = cache.get(uaString);
	}
	if (normalized) {
		this.ua = new useragent.Agent(normalized[1], normalized[2], (normalized[3] || 0), (normalized[4] || 0));
	} else {

		/* Remove UA tokens that unnecessarily complicate UA parsing */

		// Chrome and Opera on iOS uses a UIWebView of the underlying platform to render
		// content. By stripping the CriOS or OPiOS strings, the useragent parser will alias the
		// user agent to ios_saf for the UIWebView, which is closer to the actual renderer
		uaString = uaString.replace(/((CriOS|OPiOS)\/(\d+)\.(\d+)\.(\d+)\.(\d+)|(FxiOS\/(\d+)\.(\d+)))/, '');

		// Vivaldi browser is recognised by UA module but is actually identical to Chrome, so
		// the best way to get accurate targeting is to remove the vivaldi token from the UA
		uaString = uaString.replace(/ vivaldi\/[\d\.]+\d+/i, '');

		// Facebook in-app browser `[FBAN/.....]` or `[FB_IAB/.....]` (see #990)
		uaString = uaString.replace(/ \[(FB_IAB|FBAN|FBIOS|FB4A)\/[^\]]+\]/i, '');

		// Electron ` Electron/X.Y.Z` (see #1129)
		uaString = uaString.replace(/ Electron\/[\d\.]+\d+/i, '');

		this.ua = useragent.parse(uaString);

		// For improved CDN cache performance, remove the patch version.  There are few cases in which a patch release drops the requirement for a polyfill, but if so, the polyfill can simply be served unnecessarily to the patch versions that contain the fix, and we can stop targeting at the next minor release.
		this.ua.patch = '0';

		// Resolve aliases
		this.ua.family = this.ua.family.toLowerCase();
		if (aliases[this.ua.family]) {

			// Custom aliasing
			if (typeof aliases[this.ua.family] === 'function') {
				Object.assign(this.ua, aliases[this.ua.family](this.ua));

			// Map to different family, use same version scheme
			} else if (typeof aliases[this.ua.family] === 'string') {
				this.ua.family = aliases[this.ua.family];

			// Map to different family with constant version
			} else if (Array.isArray(aliases[this.ua.family]) && aliases[this.ua.family].length >= 2) {
				const a = aliases[this.ua.family];
				this.ua = new useragent.Agent(a[0], a[1], (a[2] || 0), (a[3] || 0));

			// Map to different family with per-version mapping
			} else if (typeof aliases[this.ua.family] === 'object') {
				const minDiff = {
					major: Number.MAX_SAFE_INTEGER,
					minor: Number.MAX_SAFE_INTEGER,
					lastUa: this.ua
				};

				let currDiff = minDiff;

				for (let semverExpr in aliases[this.ua.family]) {
					if (Array.isArray(aliases[this.ua.family][semverExpr])) {
						const a = aliases[this.ua.family][semverExpr];
						let ua = new useragent.Agent(a[0], a[1], (a[2] || 0), (a[3] || 0));

						// Check exact semver
						if (this.ua.satisfies(semverExpr)) {
							minDiff.lastUa = ua;
							break;
						}

						// Fallback to nearest match

						let [semverMajor, semverMinor] = semverExpr.split('.').slice(0,2);

						currDiff = {
							major: Math.abs(this.ua.major - Number(semverMajor || 0)),
							minor: Math.abs(this.ua.minor - Number(semverMinor || 0)),
							lastUa: ua
						};

						if (currDiff.major <= minDiff.major) {
							minDiff.major = currDiff.major;
							if (currDiff.minor <= minDiff.minor) {
								minDiff.minor = currDiff.minor;
								minDiff.lastUa = currDiff.lastUa;
							}
						}
					}
				}

				this.ua = minDiff.lastUa;
			}
		}
		cache.set(uaString, ["", this.ua.family, this.ua.major, this.ua.minor, this.ua.patch]);
	}
}

UA.prototype.getFamily = function() {
	return this.ua.family;
};

UA.prototype.getVersion = function() {
	return this.ua.toVersion();
};

UA.prototype.satisfies = function() {
	return (
		this.ua.satisfies.apply(this.ua, arguments) &&
		this.ua.family in baseLineVersions &&
		this.ua.satisfies(baseLineVersions[this.ua.family])
	);
};
UA.prototype.getBaseline = function() {
	return baseLineVersions[this.ua.family];
};
UA.prototype.meetsBaseline = function() {
	return (this.ua.satisfies(baseLineVersions[this.ua.family]));
};
UA.prototype.isUnknown = function() {
	return (Object.keys(baseLineVersions).indexOf(this.ua.family) === -1) || !this.meetsBaseline();
};

UA.normalize = function(uaString) {
	if (uaString.match(/^\w+\/\d+(\.\d+(\.\d+)?)?$/i)) {
		return uaString.toLowerCase();
	}
	const ua = new UA(uaString);
	return ua.getFamily() + '/' + ua.getVersion();
};

UA.getBaselines = function() {
	return baseLineVersions;
};


module.exports = UA;
