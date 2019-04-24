$(function () {
  var $table = $("#label-table");
  var url = '/labels/labels/';
  var $remove = $("#remove_label")
  
    window.operateEvents = {
        'click .remove': function(e, value, row, index) {
            remove_items([row.id]);
        }
    };
    
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
       });;
    }
    
    $table.on('check.bs.table uncheck.bs.table ' +
            'check-all.bs.table uncheck-all.bs.table', function () {
        $remove.prop('disabled', !$table.bootstrapTable('getSelections').length);
    });        
    
    function operateFormatter(value, row, index) {
        return [
            '<a class="remove" href="javascript:void(0)" title="Remove">',
            '<i class="fas fa-trash-alt"></i>',
            '</a>',
        ].join('');
    }
    
    $remove.click(function () {
        var ids = getIdSelections();
        remove_items(ids);
        $remove.prop('disabled', true);
    });
    
    $('#add_label').click(function() {
        $.ajax({
            url: url,
            type: 'POST',
            data: {'action': 'new'}
        }).done(function() {
            $table.bootstrapTable('refresh');
        }).fail(function(response) {
          $("#label_error").text(response.statusText);
        })
    });
    
    function getIdSelections() {
        return $.map($table.bootstrapTable('getSelections'), function (row) {
            return row.id
        });
    }        
    
    $table.bootstrapTable({
        url: url,
        editableUrl: url,
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
                editable: true
        }, {
                title: 'Color',
                field: 'color',
                align: 'center',
                valign: 'middle',
                width: 150,
                sortable: true,
                editable: true,
                visible: false
        }, {
                field: 'operate',
                title: 'Actions',
                align: 'center',
                width: 100,
                events: operateEvents,
                formatter: operateFormatter
        }]
    });
});
