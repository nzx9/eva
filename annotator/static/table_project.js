$(function () {
  var $table = $("#project-table");
  var url = '/labels/project/';
  var label_select_url = '/labels/label_select/';
  var $remove = $("#remove_project")
  var labelSelectRow = -1;
  
    window.operateEvents = {
        'click .add-labels': function(e, value, row, index) {
            labelSelectRow = row.id;
            $('#selectLabelsModal').modal();
        },
        'click .remove': function(e, value, row, index) {
            remove_items([row.id]);
        }
    };

    function loadLabelSelectTable(params) {
      if (labelSelectRow > 0) {
        $.ajax({
            url: label_select_url,
            type: 'GET',
            data: {'project_id': labelSelectRow}
        }).done(function(response) {
            params.success(response)
        });
      }
    }
    
    $('#selectLabelsModal').on('shown.bs.modal', function () {
      $('#labelSelect-table').bootstrapTable('refresh');
    });
    
    $('#selectLabelsModal').on('hide.bs.modal', function () {
      $("#project-table").bootstrapTable('refresh');
    });
    
    function remove_items(ids) {
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
      }).fail(function(response){
            $.notify({
                icon: 'fas fa-thumbs-down',
                message: response.statusText,
            },{
                type: 'danger',
            });
       }).always(function(response) {
             $table.bootstrapTable('refresh');
       });
    }
    
    $table.on('check.bs.table uncheck.bs.table ' +
            'check-all.bs.table uncheck-all.bs.table', function () {
        $remove.prop('disabled', !$table.bootstrapTable('getSelections').length);
    });        

    $table.on('load-success.bs.table', function(){
        $('.detail-icon').attr({'title': 'Show labels', 'data-toggle':'tooltip', 'data-placement':'bottom'});
    });

    function operateFormatter(value, row, index) {
        return [
            '<a class="remove" href="javascript:void(0)" title="Remove">',
            '<i class="fas fa-trash-alt"></i>',
            '</a>',
        ].join('');
    }
    
    function addLabelsFormatter(value, row, index) {
      return [
        '<button class="btn btn-primary btn-xs add-labels">',
        'Add Labels',
        '</button>'
      ].join('');
    }
    
    $remove.click(function () {
        var ids = getIdSelections();
        remove_items(ids);
        $remove.prop('disabled', true);
    });
    
    $('#add_project').click(function() {
        $.ajax({
            url: url,
            type: 'POST',
            data: {'action': 'new'}
        }).done(function() {
            $table.bootstrapTable('refresh');
        }).fail(function(response) {
          $("#project_error").text(response.statusText);

        })
    });
    
    function getIdSelections() {
        return $.map($table.bootstrapTable('getSelections'), function (row) {
            return row.id
        });
    }        
    
    function labelsetDetails(index, row) {
      var html = '<b>Labels:</b> ' + row.labels.join(', ') + '';
      return html;
    }
    
    $("#project-table").bootstrapTable({
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
                title: 'Project name',
                field: 'name',
                align: 'center',
                valign: 'middle',
                sortable: true,
                editable: true
        }, {
                title: 'Description',
                field: 'desc',
                align: 'center',
                valign: 'middle',
                sortable: true,
                editable: true
        }, {
                field: 'addLabels',
                title: 'Labels',
                align: 'center',
                events: operateEvents,
                formatter: addLabelsFormatter
        }, {
                field: 'operate',
                title: 'Actions',
                align: 'center',
                width: 100,
                events: operateEvents,
                formatter: operateFormatter
        }],
        url: url,
        editableUrl: url, 
        showExport: true,
        detailView: true,
        detailFormatter: labelsetDetails,
    });
    
    
    $('#labelSelect-table').on('check.bs.table uncheck.bs.table ' +
            'check-all.bs.table uncheck-all.bs.table', function () {
        $('#removeLabelSelect').prop('disabled', !$('#labelSelect-table').bootstrapTable('getSelections').length);
    });
    
    function labelSelectParams(params) {
      params.project_id = labelSelectRow;
      return params;
    }
    
    $('#addLabelSelect').click(function() {
        $('#labelSelect-table').bootstrapTable('append', {'id': -1, 'name': '', 'num': ''});
    });
    
    $('#removeLabelSelect').click(function () {
        var ids = $.map($('#labelSelect-table').bootstrapTable('getSelections'), function (row) {
            return row.id
        });
        $.ajax({
            url: label_select_url,
            type: 'POST',
            data: {'action': 'delete', 'id': ids}
        }).done(function(response) {
            //$table.bootstrapTable('refresh');
            $('#labelSelect-table').bootstrapTable('remove', {
                field: 'id',
                values: ids
            });
        }).fail(function(response) {
            $("#errorLabelSelect").text(response.statusText);
            setTimeout(function(){$("#errorLabelSelect").empty();}, 2000);
        });
        $('#removeLabelSelect').prop('disabled', true);
    });
    
    function labelSelectSuccess(response, newValue) {
      if (response.status == 'new') {
        var index = $(this).parents('tr').data('index');
        $('#labelSelect-table').bootstrapTable('updateRow', {
            index: index,
            row: {
                id: response.data.id,
                name: response.data.name,
                num: response.data.num
            }
        });
      }
    }
    
    $('#labelSelect-table').bootstrapTable({
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
                title: 'Label name',
                field: 'name',
                align: 'center',
                valign: 'middle',
                sortable: true,
                editable: {
                  title: 'Select label',
                  type: 'select',
                  source: '/labels/labels/',
                  showbuttons: false, 
                  params: labelSelectParams,
                  success: labelSelectSuccess
                }
        }, {
                title: 'Number',
                field: 'num',
                align: 'center',
                valign: 'middle',
                sortable: true,
                editable: {
                  params: labelSelectParams,
                  success: labelSelectSuccess
                }
        }],
        ajax: loadLabelSelectTable,
        editableUrl: label_select_url
    });      
});
