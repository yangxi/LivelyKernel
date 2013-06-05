module('lively.bindings.FRPTranslator').requires('ometa.lively').toRun(function() {
FRPTranslator=objectThatDelegatesTo(OMeta,{
"start":function(){var $elf=this,_fromIdx=this.input.idx,t;return (function(){this._apply("empty");(function (){(this["id"]=(0));(this["dependents"]=[]);(this["hasSubExpression"]=false);(this["result"]=new StringBuffer());this["result"].nextPutAll("(function () {var strm = new lively.bindings.FRPCore.EventStream(); ")}).bind(this)();t=this._apply("trans");return (function (){if(this["hasSubExpression"]){this["result"].nextPutAll("return strm.finalize([");this["result"].nextPutAll(this["dependents"].join(", "));this["result"].nextPutAll("])})();");return this["result"].contents()}else{return t["refString"]}}).bind(this)()}).call(this)},
"trans":function(){var $elf=this,_fromIdx=this.input.idx,t,ans;return (function(){this._form((function(){return (function(){t=this._apply("anything");return ans=this._applyWithArgs("apply",t)}).call(this)}));return ans}).call(this)},
"curlyTrans":function(){var $elf=this,_fromIdx=this.input.idx,r,rs;return this._or((function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","begin");return r=this._apply("curlyTrans")}).call(this)}));return r}).call(this)}),(function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","begin");return rs=this._many((function(){return this._apply("trans")}))}).call(this)}));return (("{" + rs.join(";")) + "}")}).call(this)}),(function(){return (function(){r=this._apply("trans");return (("{" + r) + "}")}).call(this)}))},
"binop":function(){var $elf=this,_fromIdx=this.input.idx,op,ll,rr;return (function(){op=this._apply("anything");ll=this._apply("trans");rr=this._apply("trans");return (function (){var isStream=(ll["isStream"] || rr["isStream"]);if(isStream){var id=this.nextId();var strmDef=this.makeBinop([ll,rr],op);var deps=ll["dependencies"].clone().concat(rr["dependencies"]);this.addSubExpression(id,strmDef,deps);return ({"refString": this.ref(id),"dependencies": deps,"isStream": true})}else{return ({"refString": Strings.format("(%s %s %s)",ll["refString"],op,rr["refString"]),"dependencies": [],"isStream": false})}}).bind(this)()}).call(this)},
"func":function(){var $elf=this,_fromIdx=this.input.idx,args,body;return (function(){args=this._apply("anything");body=this._apply("curlyTrans");return [(((("(function (" + args.join(",")) + ")") + body) + ")"),false]}).call(this)},
"call":function(){var $elf=this,_fromIdx=this.input.idx,ll,rr;return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","get");return this._applyWithArgs("exactly","durationE")}).call(this)}));ll=this._apply("trans");rr=this._apply("trans");return (function (){var id=this.nextId();var strmDef=this.makeDurationE(ll["refString"],rr["refString"]);var deps=ll["dependencies"].clone().concat(rr["dependencies"]);this.addSubExpression(id,strmDef,deps);return ({"refString": this.ref(id),"dependencies": deps,"isStream": true})}).bind(this)()}).call(this)},
"get":function(){var $elf=this,_fromIdx=this.input.idx,n;return (function(){n=this._apply("anything");this._pred((n["constructor"] === String));return (function (){this["dependents"].push(this.ref(n));return ({"refString": this.ref(n),"dependencies": [n],"isStream": true})}).bind(this)()}).call(this)},
"getLast":function(){var $elf=this,_fromIdx=this.input.idx,n;return (function(){n=this._apply("anything");this._pred((n["constructor"] === String));return (function (){return ({"refString": (("this.owner." + n) + ".lastValue"),"dependencies": [],"isStream": false})}).bind(this)()}).call(this)},
"number":function(){var $elf=this,_fromIdx=this.input.idx,n;return (function(){n=this._apply("anything");this._pred((n["constructor"] === Number));return (function (){return ({"refString": Objects.inspect(n),"dependencies": [],"isStream": false})}).bind(this)()}).call(this)},
"begin":function(){var $elf=this,_fromIdx=this.input.idx;return this._apply("trans")}})
});