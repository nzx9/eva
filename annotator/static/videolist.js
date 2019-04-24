"use strict";

window.onload = function () { 
	$('#vlist-table').on('click','.anchor-view',function(e){
		e.preventDefault();
		var id = $(this).attr('value');
		viewVideo(id);
	})
}

function nameStatusDisplay (status, id) {
    var elems = {
          success: $("#check-mark-video-"+id),
          loading: $("#spinner-video-"+id)
    };
    Object.values(elems).map(function (elem) { elem.hide(); });
    if (status in elems) {
        elems[status].show();
    }
}

function viewVideo(id){
	var retry = 0;

	nameStatusDisplay("loading", id);
	$.post("/video/status/"+id+"/", handler);	// Check and refresh video status

	function handler (data) {
		switch (data['status']) {
			case 'ok':
				nameStatusDisplay("success", id);
				window.location.href = 'video/'+id+'/0/';
				break;
			case 'error':
				$.notify({
					icon: 'fas fa-thumbs-down',
					message: data['text'],
					},{
					type: 'danger',
				   });
				nameStatusDisplay("", id);
				break;
			case 'wait':
				if (retry == 0) {
					$.notify({
						icon: 'fas fa-info-circle',
						message: data['text'],
						},{
						type: 'info',
					   });
				}

				// Check if refresh is finalized
				if (retry <= 50) { //TO DO: using a large value for time being.
					setTimeout(function() {$.get('video/status/'+id+'/', {task_id: data['task_id']}, handler)}, 500 + retry*450);
					retry = retry + 1;
				} else {
					nameStatusDisplay("", id);
					$.notify({
						icon: 'fas fa-thumbs-down',
						message: 'Timeout: Something went wrong',
						},{
						type: 'danger',
					   });
				}
				break;
		}
	}
}
