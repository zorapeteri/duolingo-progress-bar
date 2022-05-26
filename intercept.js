const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

function checkIfLoaded() {
  if (!document.getElementById('__interceptedRequest')) {
    document.querySelector('[data-test="courses-menu"]').children[0].click();
    Array.from(document.querySelectorAll('[data-test="courses-menu-content"] > div > div'))
      .find((node) => node.classList.length === 2)
      .click();
  }
}

function interceptData() {
  var xhrOverrideScript = document.createElement('script');
  xhrOverrideScript.innerHTML = `
  (function() {
    var XHR = XMLHttpRequest.prototype;
    var send = XHR.send;
    var open = XHR.open;
    XHR.open = function(method, url) {
        this.url = url;
        return open.apply(this, arguments);
    }
    XHR.send = function() {
        this.addEventListener('load', function() {
            if (this.url.includes('currentCourse')) {
               if (document.getElementById('__interceptedRequest')) {
                  document.getElementById('__interceptedRequest').remove()
               }
                var element = document.createElement('div');
                element.id = '__interceptedRequest';
                element.innerText = JSON.stringify(this.response);
                element.style.display = 'none';
                document.body.appendChild(element);
            }               
        });
        return send.apply(this, arguments);
    };
  })();
  `;
  document.head.prepend(xhrOverrideScript);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (!mutation.addedNodes) return;

      const interceptedRequest = Array.from(mutation.addedNodes).find(
        (node) => node.id === '__interceptedRequest',
      );

      if (interceptedRequest) {
        if (document.getElementById('duolingo-progress-bar')) {
          document.getElementById('duolingo-progress-bar').remove();
          document.querySelector('.duolingo-progress-bar-tooltip').remove();
          document.querySelector('.duolingo-progress-bar-percentage').remove();
          document.querySelector('.duolingo-progress-bar-skillCompletion').remove();
        }
        processSkills(JSON.parse(interceptedRequest.innerText).currentCourse.skills);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });

  if (isFirefox) setTimeout(checkIfLoaded, 500);
}

document.addEventListener('DOMContentLoaded', interceptData, false);
