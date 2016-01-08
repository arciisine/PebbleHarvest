window.config = (function() {

  var config = {
      options : {},
      queryParams : function(target, prefix) {
          target = target || window.location.search;
          var match,
              pl     = /\+/g,  // Regex for replacing addition symbol with a space
              search = /([^&=]+)=?([^&]*)/g,
              decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
              query  = target.substring(1);

          var urlParams = {};
          while (match = search.exec(query))
          urlParams[(prefix ? prefix + '.' : '') + decode(match[1])] = decode(match[2]);
          return urlParams; 
      },
      readOptions : function() {
        try {
          return JSON.parse(window.localStorage.getItem("options"));
        } catch (e) {
          return {};
        }
      },
      writeOptions : function(opts) {
        var val = JSON.stringify(opts);
        window.localStorage.setItem("options", val);
        return val;
      },
      setRedirectLocation : function() {
        document.querySelector('form input[name="redirect_uri"]').value = ('' + window.location);  
      },
      setFormAction : function() {
        var domain =  document.querySelector('form input[name=domain]').value;
        document.querySelector('form').action = 'https://' + domain + '.harvestapp.com/oauth2/authorize';                  
      },
      optionsToForm : function(opts) {
        if (typeof opts === 'string') {
          opts = JSON.parse(opts);
        }
        
        opts = opts || {};
        
        var inputs = document.querySelectorAll('input,textarea,select')
        for (var i = 0; i < inputs.length; i++) {
          var key = inputs[i].form.name + '.' + inputs[i].name;
          console.log('|'+key+'|', opts[key]);
          if (opts[key]) {
            this.options[key] = inputs[i].value = opts[key];
            inputs[i].dispatchEvent(new Event("change"))
          }
        }
      },
      formToOptions : function() {
        var opts = {};
        var inputs = document.querySelectorAll('input,textarea,select')
        for (var i = 0; i < inputs.length; i++) {
          var key = inputs[i].form.name + '.' + inputs[i].name;
          console.log(key);
          if (inputs[i].value) {
            opts[key] = inputs[i].value;
          }
        }
        console.log(opts);
        return opts;
      },
      saveAndClose : function() {
        var opts = this.formToOptions();
        var str = this.writeOptions(opts);
        var returnTo = this.queryParams().return_to || 'pebblejs://close';
        
        document.location.assign(returnTo + '#' + encodeURIComponent(str));
      }
  };
  
  return config;
})();