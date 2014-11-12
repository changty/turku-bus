(function($){
    $.fn.jExpand = function(){
        var element = this;

        $(element).find("tr:odd").addClass("odd");
        $(element).find("tr:not(.odd)").hide();
        $(element).find("tr:first-child").show();

        $(element).find("tr.odd").click(function() {
	       	$(element).find("tr:not(.odd)").hide(); 

            if($(this).hasClass('active-row')) {
            	$(this).removeClass('active-row');
            }
            else {
   		       	$(element).find("tr").removeClass('active-row');
            	$(this).addClass('active-row');
            	$(this).next("tr").slideToggle("slow");
            }
        });
        
    }    
})(jQuery); 