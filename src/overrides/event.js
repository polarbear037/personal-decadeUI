import "noname";
function s(s, e) {
	(void 0 === this._messages && (this._messages = {}), (s = s.toLowerCase()), void 0 === this._messages[s] && (this._messages[s] = []), this._messages[s].push(e));
}
function e(message) {
	if (void 0 === this._messages) return;
	if (((message = message.toLowerCase()), void 0 === this._messages[message])) return;
	const callbacks = this._messages[message];
	for (let t = 0; t < callbacks.length; t++) "function" == typeof callbacks[t] && callbacks[t].call(this);
	this._messages[message] = [];
}
export { s as eventAddMessageHook, e as eventTriggerMessage };
