window.config = (function() {

  var config = {
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
        document.querySelector('form input[name="redirect_uri"]').value = ('' + window.location).split('#')[0].split('&code')[0];  
      },
      deauthorize : function() {
        var options = {
          'oauth.code' : null
        }
        config.optionsToForm(options);
        config.writeOptions(options);
        config.updateDisplay();
      },
      updateDisplay : function() {
        var authorized = (!!document.querySelector('form[name="oauth"] input[name="code"]').value) ? 'authorized' : 'unauthorized';
        ['unauthorized', 'authorized'].forEach(function(k) {
          var items = document.querySelectorAll('.'+k);
          for (var i = 0; i < items.length;i++) {
            items[i].style.display = authorized == k ? 'block' : 'none';
          }
        });
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
          if (opts[key] !== undefined) {
            inputs[i].value = opts[key];
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
        delete opts.redirect_uri;
        var str = this.writeOptions(opts);
        var returnTo = this.queryParams().return_to || 'pebblejs://close#';
        
        document.location.assign(returnTo + encodeURIComponent(str));
      }
  };
  
  return config;
})();