module('lively.morphic.Chris').requires().toRun(function() {

    lively.morphic.Morph.subclass('lively.morphic.Chris.Buttons', 'events', {
        initialize: function($super){
            $super();
        },
        alertMe: function(){
            alert('hello world');
        }
    });    

}) // end of module