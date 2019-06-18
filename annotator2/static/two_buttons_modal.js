var two_buttons_modal = (function () {
    
    var params = {
        title: "",
        body: "",
        text_a: "",
        text_b: "",
        callback_a: null,
        callback_b: null
    };

    var init = false;
    var modal = null;
    var title = null;
    var body = null;
    var button_a = null;
    var button_b = null;

    var set_up = function (args) {
        if (!init) {
            modal = $('#twoButtonsModal');
            title =$('#twoButtonsModalTitle');
            body = $('#twoButtonsModalMessage');
            button_a = $('#twoButtonsModalOptionA');
            button_b = $('#twoButtonsModalOptionB');
            button_a.on("click.callback", function() { if (params.callback_a) params.callback_a() });
            button_b.on("click.callback", function() { if (params.callback_b) params.callback_b() });
            init = true;
        }

        for (var param in params) {
            if (param in args) {
                params[param] = args[param];
            }
        }

        title.text(params.title);
        body.text(params.body);
        button_a.text(params.text_a);
        button_b.text(params.text_b);
        return this;
    };

    return {
        set_up: set_up, 
        activate: function () { modal.modal({backdrop: 'static', keyboard: false}) }
    };

})();
