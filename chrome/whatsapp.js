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

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import("resource://gre/modules/ctypes.jsm");
const HWND_TOPMOST = -1;
const HWND_NOTOPMOST = -2;
const SWP_NOSIZE = 1;
const SWP_NOMOVE = 2;
const SWP_HIDEWINDOW = 80;
const SW_HIDE = 0;
var aotUser32Lib = ctypes.open("user32");
var setWindowPos = aotUser32Lib.declare("SetWindowPos",
ctypes.winapi_abi,
ctypes.bool,
ctypes.uint32_t,
ctypes.int32_t,
ctypes.int32_t,
ctypes.int32_t,
ctypes.int32_t,
ctypes.int32_t,
ctypes.uint32_t);
var getActiveWindow = aotUser32Lib.declare("GetActiveWindow",
ctypes.winapi_abi,
ctypes.uint32_t);

var adb = Components.classes["@mozilla.org/file/directory_service;1"].
getService(Components.interfaces.nsIProperties).
get("ProfD", Components.interfaces.nsIFile);
adb.append("extensions");
adb.append("{84c1f790-76c7-11e2-bcfd-0800200c9a66}");
adb.append("adb.vbs");

function pnCountNoteChars(evt) {
  //allow non character keys (delete, backspace and and etc.)
  if ((evt.charCode == 0) && (evt.keyCode == 13)){
	//var n=evt.target.value.replace(/\s{1,}/g, '_');
	var n=evt.target.value.split(" ");
	  for (var i=0; i < n.length; i++){
		var process = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
		process.init(adb);
		process.run(true, ['text', n[i]], 2);
		var space = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
		space.init(adb);
		space.run(true, ['keyevent', '62'], 2);
	  }
	enviar();
	evt.target.value="";
	return false;
	}
	
  if ((evt.charCode == 0) && (evt.keyCode != 13)){
	return true;
	}
 
  if (evt.target.value.length < 100) {
    return true;
  } else {
    return false;
  }
}

function enviar() {
	var process1 = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
	var process2 = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
	process1.init(adb);
	process1.run(true, ['keyevent', '22'], 2);
	process2.init(adb);
	process2.run(true, ['keyevent', '66'], 2);
	return;
}

var aot = {
	load: function () {
		document.getElementById('pnNote').focus();
		var flag = true;
		let jsconsole = Services.wm.getMostRecentWindow("whatsapp:main");
		if (jsconsole) jsconsole.focus()
		else return;
		try {
			let hWnd = getActiveWindow();
			setWindowPos(hWnd, flag === true ? HWND_TOPMOST : HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE);
		} catch (ex) {
			Components.utils.reportError(ex);
		}
	}
};

this.addEventListener("load", aot.load, false);