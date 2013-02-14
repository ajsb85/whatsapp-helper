/* ***** BEGIN LICENSE BLOCK *****
 * Version: MIT/X11 License
 * 
 * Copyright (c) 2013 Alexander Salas
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Contributor(s):
 *
 *   Alexander Salas <a.salas@ieee.org> (Original Author)
 *
 * ***** END LICENSE BLOCK ***** */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");

const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const keysetID = "adb-key-event-keyset";
const keyID = "RR:WhatsApp";
const fileMenuitemID = "menu_FileWhatsAppItem";
var XUL_APP = {name: Services.appinfo.name};

switch(Services.appinfo.name) {
case "Thunderbird":
  XUL_APP.winType = "mail:3pane";
  XUL_APP.baseKeyset = "mailKeys";
  break;
case "Fennec": break;
default: //"Firefox", "SeaMonkey"
  XUL_APP.winType = "navigator:browser";
  XUL_APP.baseKeyset = "mainKeyset";
}

const PREF_BRANCH = "extensions.adb-key-event.";
const PREFS = {
  modifiers: "accel,alt",
  locale: Cc["@mozilla.org/chrome/chrome-registry;1"]
      .getService(Ci.nsIXULChromeRegistry).getSelectedLocale("global"),
  toolbar: "",
  "toolbar.before": "",
  key : "W"
  //get key() _("whatsapp.ak", getPref("locale"))
};

var prefChgHandlers = [];
let PREF_OBSERVER = {
  observe: function(aSubject, aTopic, aData) {
    if ("nsPref:changed" != aTopic || !(aData in PREFS)) return;
    prefChgHandlers.forEach(function(func) func && func(aData));
  }
}

let logo = "";


/* Includes a javascript file with loadSubScript
*
* @param src (String)
* The url of a javascript file to include.
*/
(function(global) global.include = function include(src) {
  var o = {};
  Components.utils.import("resource://gre/modules/Services.jsm", o);
  var uri = o.Services.io.newURI(
      src, null, o.Services.io.newURI(__SCRIPT_URI_SPEC__, null, null));
  o.Services.scriptloader.loadSubScript(uri.spec, global);
})(this);

/* Imports a commonjs style javascript file with loadSubScrpt
 * 
 * @param src (String)
 * The url of a javascript file.
 */
(function(global) {
  var modules = {};
  global.require = function require(src) {
    if (modules[src]) return modules[src];
    var scope = {require: global.require, exports: {}};
    var tools = {};
    Components.utils.import("resource://gre/modules/Services.jsm", tools);
    var baseURI = tools.Services.io.newURI(__SCRIPT_URI_SPEC__, null, null);
    try {
      var uri = tools.Services.io.newURI(
          "packages/" + src + ".js", null, baseURI);
      tools.Services.scriptloader.loadSubScript(uri.spec, scope);
    } catch (e) {
      var uri = tools.Services.io.newURI(src, null, baseURI);
      tools.Services.scriptloader.loadSubScript(uri.spec, scope);
    }
    return modules[src] = scope.exports;
  }
})(this);


var {unload} = require("unload");
var {runOnLoad, runOnWindows, watchWindows} = require("window-utils");
include("includes/l10n.js");
include("includes/prefs.js");


function setPref(aKey, aVal) {
  aVal = ("wrapper-adbkeyevent-toolbarbutton" == aVal) ? "" : aVal;
  switch (typeof(aVal)) {
    case "string":
      var ss = Cc["@mozilla.org/supports-string;1"]
          .createInstance(Ci.nsISupportsString);
      ss.data = aVal;
      Services.prefs.getBranch(PREF_BRANCH)
          .setComplexValue(aKey, Ci.nsISupportsString, ss);
      break;
  }
}

function addMenuItem(win) {
  var $ = function(id) win.document.getElementById(id);

  function removeMI() {
    var menuitem = $(fileMenuitemID);
    menuitem && menuitem.parentNode.removeChild(menuitem);
  }
  removeMI();

  // add the new menuitem to File menu
  let (whatsappMI = win.document.createElementNS(NS_XUL, "menuitem")) {
    whatsappMI.setAttribute("id", fileMenuitemID);
    whatsappMI.setAttribute("class", "menuitem-iconic");
    whatsappMI.setAttribute("label", _("adbkeyevent", getPref("locale")));
    whatsappMI.setAttribute("accesskey", "W");
    whatsappMI.setAttribute("key", keyID);
    whatsappMI.style.listStyleImage = "url('" + logo + "')";
    whatsappMI.addEventListener("command", whatsapp, true);

    $("menu_FilePopup").insertBefore(whatsappMI, $("menu_FileQuitItem"));
  }

  unload(removeMI, win);
}

function whatsapp(win) {
	 Services.ww.openWindow(null, "chrome://adbkeyevent/content/whatsapp.xul",
                         "whatsapp", "centerscreen,chrome,modal,titlebar,dialog", null); 
	return true;
}

function startADBServer() {
  var adb;
  try {
	var file = Services.prefs.getCharPref('extensions.adb-key-event.adb');
	adb = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
	adb.initWithPath(file);
  } catch(e) {
	adb = pickADBExecutable();
  }
  while (true) {
	var process = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
	try {
	  process.init(adb);
	  process.run(true, ['start-server'], 1);
	  return;
	} catch(e) {
	  adb = pickADBExecutable();
	}
  }
}
function pickADBExecutable() {
  var filePicker = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
  filePicker.init(Services.wm.getMostRecentWindow(null), 'Select adb location', Ci.nsIFilePicker.modeOpen);
  var filter = (Services.appinfo.OS == 'WINNT') ? 'adb.exe' : 'adb';
  filePicker.appendFilter(filter, filter);
  if (filePicker.show() == Ci.nsIFilePicker.returnOK) {
	Services.prefs.setCharPref('extensions.adb-key-event.adb', filePicker.file.path);
	return filePicker.file;
  } else {
	// Cancel
  }
}


function main(win) {
  let doc = win.document;
  function $(id) doc.getElementById(id);
  function xul(type) doc.createElementNS(NS_XUL, type);

  let rrKeyset = xul("keyset");
  rrKeyset.setAttribute("id", keysetID);

  // add hotkey
  let (whatsappKey = xul("key")) {
    whatsappKey.setAttribute("id", keyID);
    whatsappKey.setAttribute("key", getPref("key"));
    whatsappKey.setAttribute("modifiers", getPref("modifiers"));
    whatsappKey.setAttribute("oncommand", "void(0);");
    whatsappKey.addEventListener("command", whatsapp, true);
    $(XUL_APP.baseKeyset).parentNode.appendChild(rrKeyset).appendChild(whatsappKey);
  }

  // add menu bar item to File menu
  addMenuItem(win);

  // add app menu item to Firefox button for Windows 7
  let appMenu = $("appmenuPrimaryPane"), whatsappAMI;
  if (appMenu) {
    whatsappAMI = $(fileMenuitemID).cloneNode(false);
    whatsappAMI.setAttribute("id", "appmenu_WhatsAppItem");
    whatsappAMI.setAttribute("class", "menuitem-iconic menuitem-iconic-tooltip");
    whatsappAMI.style.listStyleImage = "url('" + logo + "')";
    whatsappAMI.addEventListener("command", whatsapp, true);
    appMenu.insertBefore(whatsappAMI, $("appmenu-quit"));
  }

  // add toolbar button
  let rrTBB = xul("toolbarbutton");
  rrTBB.setAttribute("id", "adbkeyevent-toolbarbutton");
  rrTBB.setAttribute("type", "button");
  rrTBB.setAttribute("image", addon.getResourceURI("icon16.png").spec);
  rrTBB.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
  rrTBB.setAttribute("label", _("adbkeyevent", getPref("locale")));
  rrTBB.addEventListener("command", whatsapp, true);
  let tbID = getPref("toolbar");
  ($("navigator-toolbox") || $("mail-toolbox")).palette.appendChild(rrTBB);
  if (tbID) {
    var tb = $(tbID);
    if (tb) {
      let b4ID = getPref("toolbar.before");
      let b4 = $(b4ID);
      if (!b4) { // fallback for issue 34
        let currentset = tb.getAttribute("currentset").split(",");
        let i = currentset.indexOf("adbkeyevent-toolbarbutton") + 1;
        if (i > 0) {
          let len = currentset.length;
          for (; i < len; i++) {
            b4 = $(currentset[i]);
            if (b4) break;
          }
        }
      }
      tb.insertItem("adbkeyevent-toolbarbutton", b4, null, false);
    }
  }

  function saveTBNodeInfo(aEvt) {
    setPref("toolbar", rrTBB.parentNode.getAttribute("id") || "");
    setPref("toolbar.before", (rrTBB.nextSibling || "")
        && rrTBB.nextSibling.getAttribute("id").replace(/^wrapper-/i, ""));
  }
  win.addEventListener("aftercustomization", saveTBNodeInfo, false);

  var prefChgHandlerIndex = prefChgHandlers.push(function(aData) {
    switch (aData) {
      case "locale":
        let label = _("adbkeyevent", getPref("locale"));
        $(keyID).setAttribute("label", label);
        rrTBB.setAttribute("label", label);
        break;
      case "key":
      case "modifiers":
        $(keyID).setAttribute(aData, getPref(aData));
        break;
    }
    addMenuItem(win);
  }) - 1;

  unload(function() {
    rrKeyset.parentNode.removeChild(rrKeyset);
    appMenu && appMenu.removeChild(whatsappAMI);
    rrTBB.parentNode.removeChild(rrTBB);
    win.removeEventListener("aftercustomization", saveTBNodeInfo);
    prefChgHandlers[prefChgHandlerIndex] = null;
  }, win);	
}

var addon = {
  getResourceURI: function(filePath) ({
    spec: __SCRIPT_URI_SPEC__ + "/../" + filePath
  })
}

function disable(id) {
  Cu.import("resource://gre/modules/AddonManager.jsm");
  AddonManager.getAddonByID(id, function(addon) {
    addon.userDisabled = true;
  });
}

function install(data) {
  if ("Fennec" == XUL_APP.name) disable(data.id);
}
function uninstall(){}
function startup(data, reason) {
  if ("Fennec" == XUL_APP.name) {
    if (ADDON_ENABLE == reason) whatsapp();
    disable(data.id);
  }
  startADBServer();
  var prefs = Services.prefs.getBranch(PREF_BRANCH);

  // setup l10n
  l10n(addon, "rr.properties");
  unload(l10n.unload);

  // setup prefs
  setDefaultPrefs();

  logo = addon.getResourceURI("images/refresh_16.png").spec;
  watchWindows(main, XUL_APP.winType);
  prefs = prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
  prefs.addObserver("", PREF_OBSERVER, false);
  unload(function() prefs.removeObserver("", PREF_OBSERVER));
};
function shutdown(data, reason) unload()
