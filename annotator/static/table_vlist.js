$(function () {
  var $table = $("#vlist-table");
  var url = '/videos/';
  var project_select_url = '/labels/project_select/';
  var $remove = $("#remove_video")
  var $export = $("#export_vlist")
  
    // Customizing the two button modal for this page:
    document.getElementById("twoButtonsModalOptionA").className += " btn-danger";

    $('#add-video-btn').click(function() {
        $('#createVideoModal').modal({backdrop: 'static', keyboard: false });
    })

    $('#createVideoModal').on('show.bs.modal', function (e){
        if($('#projectSelect').val() == null){
              $('#projectSelectError').parent().removeClass('has-success').addClass('has-error');
              $('#projectSelectError').text('No project defined').removeClass('hidden');
              $('#fileupload').prop("disabled", true);
              $('#uploadVideoBtn').prop("disabled", true);
              $('#video_name').prop("disabled", true);
        }
    })


    window.operateEvents = {
        'click .download': function(e, value, row, index) {
            download_video(row.id);
        },
        'click .remove': function(e, value, row, index) {
            two_buttons_modal.set_up({
              title: "Warning",
              body: "This will delete the video and any annotations. Are you sure" +
                     " you want to proceed?",
              text_a: "Delete video",
              text_b: "Cancel",
              callback_a: function () { remove_items([row.id]); },
            }).activate();
        }
    };
    
    function download_video(id) {
      $.post('/export/video/status/', {id: id})
       .done(loop);
         
      function loop(resp){
       if (resp['status'] == 'ok') {
         window.open('/export/video/' + id + '/');
       } else if (resp['status'] == 'wait') {
         setTimeout(function() {
           $.get('export/video/status', {task_id: resp['task_id']})
            .done(loop)}, 1000 )
       } else if (resp['status'] == 'error') {
         $.notify({
             icon: 'fas fa-thumbs-down',
             message: resp.text,
         },{
             type: 'danger',
         });
       }
      }
      
       
    }
    
    function remove_items(ids) {
      $.notify({
        icon: 'fas fa-info-circle',
        message: 'Deleting videos...',
        },{
        type: 'info',
      });        
      $.ajax({
          url: url,
          type: 'POST',
          data: {'action': 'delete', 'id': ids}
      }).done(function(response) {
          //$table.bootstrapTable('refresh');
          $table.bootstrapTable('remove', {
              field: 'id',
              values: ids
          });
      });
    }
    
    $table.on('check.bs.table uncheck.bs.table ' +
            'check-all.bs.table uncheck-all.bs.table', function () {
        $remove.prop('disabled', !$table.bootstrapTable('getSelections').length);
        $export.prop('disabled', !$table.bootstrapTable('getSelections').length);
    });
    
    $table.on('editable-init.bs.table', function() {
      console.log('init');
    });  
    
    function operateFormatter(value, row, index) {
        return [
            '<a class="download" href="javascript:void(0)" title="Download images">',
            '<span class="fas fa-download"></span>',
            '</a>',
            '&nbsp;&nbsp;&nbsp;',
            '<a class="remove" href="javascript:void(0)" title="Remove">',
            '<i class="fas fa-trash-alt"></i>',
            '</a>',
            '&nbsp;',
        ].join('');
    }
    
    function dateFormatter(value, row, index) {
      return new Date(value).toLocaleString('sv');
    }
    
    function nameFormatter(value, row, index) {
      return [
        '<a id="anchor-view-',row.id,'" class="anchor-view" value=',row.id,' href="#">',value,
        '</a>',
        '&nbsp;',
        '<span id="spinner-video-',row.id,'" class="fas fa-sync fa-spin" style="display: none"></span>',
        '<span id="check-mark-video-',row.id,'" class="fas fa-check" style="color:green;display:none"></span>',
      ].join('');
    }
    
    function annotationFormatter(value, row, index) {
      if (value) {
        return 'Yes';
      } else {
        return 'No';
      }
    }
    
    function validate_project(value){
      var data = $table.bootstrapTable('getData'),
          index = $(this).parents('tr').data('index');
      if (data[index]['annotation']) {
        if (!confirm("All previous annotations will be deleted. Are you sure?")) {
          return "Aborted.";
        }
      }
    }
    
    $remove.click(function () {
        var ids = getIdSelections();
        two_buttons_modal.set_up({
          title: "Warning",
          body: "This will delete the selected videos and any annotations. Are you sure" +
                " you want to proceed?",
          text_a: "Delete videos",
          text_b: "Cancel",
          callback_a: function () { remove_items(ids); $remove.prop('disabled', true); }
        }).activate();
    });
    
    $('#yolo-btn').click(function(){
       ids = getIdSelections();
       checkIfEmptyAnnotations();
       if (ids.length) {
            window.open('/export/labels/yolo/?id=' + JSON.stringify(ids));
        }
    })
    
    $('#pascal-voc-btn').click(function(){
        ids = getIdSelections();
        checkIfEmptyAnnotations();
        if (ids.length) {
            window.open('/export/labels/pascal_voc/?id=' + JSON.stringify(ids));
        }
    })
    
    function getIdSelections() {
        return $.map($table.bootstrapTable('getSelections'), function (row) {
              return row.id
        });
    }

    function checkIfEmptyAnnotations(){
       var videos_annotated = {}
       getAnnotationStatus().forEach(function(x) {videos_annotated[x] = (videos_annotated[x] || 0)+1;});
       if(videos_annotated['false'] > 0){
            $.notify({
                icon: 'fas fa-info-circle',
                message: videos_annotated['false'] + ' ' + 'of the selected videos has empty annotations',
            },{
            type: 'info',
            });
        }
    }

    function getAnnotationStatus(){
        return $.map($table.bootstrapTable('getSelections'), function (row) {
              return row.annotation ? true : false;
        });
    }

    $table.bootstrapTable({
        url: url,
        editableUrl: url,
        sortName: 'date',
        sortOrder: 'desc',
        columns: [{
                field: 'state',
                checkbox: true,
                align: 'center',
                valign: 'middle'
        }, {
                title: 'ID',
                field: 'id',
                visible: false
        }, {
                title: 'Video',
                field: 'name',
                align: 'center',
                valign: 'middle',
                sortable: true,
                formatter: nameFormatter
        }, {
                title: 'Modification date',
                field: 'date',
                align: 'center',
                valign: 'middle',
                sortable: true,
                formatter: dateFormatter
        }, {
                title: 'Annotation',
                field: 'annotation',
                align: 'center',
                valign: 'middle',
                sortable: true,
                width: 50,
                formatter: annotationFormatter
        }, {
                title: 'project',
                field: 'project',
                align: 'center',
                valign: 'middle',
                editable: {
                  title: 'Select project',
                  type: 'select',
                  source: project_select_url,
                  showbuttons: false,
                  validate: validate_project
                }
        }, {
                field: 'operate',
                title: 'Actions',
                align: 'center',
                width: 50,
                events: operateEvents,
                formatter: operateFormatter
        }]
    });   
});
