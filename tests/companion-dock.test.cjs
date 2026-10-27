const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require(process.env.JSDOM_MODULE || 'jsdom');
const source = fs.readFileSync(path.join(__dirname, '../dimau-companion.js'), 'utf8');

test('footer help opens the current Volau and returns focus without covering page controls', () => {
  const dom = new JSDOM('<button data-sota-help>Ask Volau</button>', {url:'https://sotakece.com',runScripts:'outside-only'});
  const {window} = dom, {document} = window;
  window.eval(source);
  const widget = document.createElement('div');
  const shadow = widget.attachShadow({mode:'open'});
  shadow.innerHTML = '<button class="bub" aria-label="Open Volau (drag to move)">Volau</button><div class="panel"><button class="x">Close</button><textarea></textarea></div>';
  document.body.append(widget);
  let opened = 0;
  window.Volau = {open(){opened++;}};
  const loader = document.querySelector('script');
  assert.equal(loader.dataset.app, 'sota-kece');
  loader.dispatchEvent(new window.Event('load'));
  assert(document.documentElement.classList.contains('sota-help-ready'));
  const opener = document.querySelector('[data-sota-help]');
  opener.click();
  assert.equal(opened,1);
  assert.equal(shadow.activeElement,shadow.querySelector('textarea'));
  shadow.querySelector('.x').click();
  assert.equal(document.activeElement,opener);
  dom.window.close();
});

test('a failed or incompatible helper leaves its default launcher untouched', () => {
  const dom = new JSDOM('', {url:'https://sotakece.com',runScripts:'outside-only'});
  dom.window.eval(source);
  dom.window.document.querySelector('script').dispatchEvent(new dom.window.Event('load'));
  assert(!dom.window.document.documentElement.classList.contains('sota-help-ready'));
  dom.window.close();
});
