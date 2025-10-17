console.log('>>> redirect-glammer.js');
import { isIOS } from 'common-ui/lib/helper/environment';
import { config } from 'core/lib/yammer_config';


(function() {
  const defaultWidthStyle = isIOS() ?
    {
      // Safari mobile ignores width for iframe, but does not ignore min-width
      width: '1px',
      'min-width': '100%',
    } :
    {
      width: '100%',
    };

  const defaultStyle = {
    border: '0px',
    overflow: 'hidden',
    'min-height': '26px',
    height: '100%',
    ...defaultWidthStyle,
  };

  function log(str) {
    if (window.console && typeof (console.log) === 'function') {
      console.log('[yammer][glammer-embed] ' + str);
    }
  }

  // --- Glammer URL helpers copied from platform/lib/embed_bootstrap_utils.ts ---
  function generateGlammerUrlWithQueryParams(options) {
    const cfg = (options && options.config) || {};
    let feedType = options && options.feedType;
    let feedId = options && options.feedId;

    if (cfg.defaultGroupId && feedType !== 'group' && feedType !== 'open-graph') {
      feedType = 'group';
      feedId = cfg.defaultGroupId;
    }

    const glammerUrl = generateGlammerUrl(feedType, feedId);
    const glammerQueryParams = generateGlammerQueryParams(options || {});

    return glammerUrl.concat(glammerQueryParams);
  }

  function getGlammerGroupFeedId(feedId) {
    if (!feedId) {
      return feedId;
    }

    const id = parseInt(feedId, 10);
    if (isNaN(id) || id <= 0) {
      return '0';
    }

    return feedId;
  }

  function generateGlammerUrl(feedType, feedId) {
    const base = config().embedGlammerBaseUri;
    switch (feedType) {
      case 'group': {
        return base + '/legacy/groups/' + getGlammerGroupFeedId(feedId);
      }
      case 'topic': {
        return base + '/legacy/topics/' + feedId;
      }
      case 'user': {
        return base + '/legacy/users/' + feedId;
      }
      case 'open-graph': {
        return base + '/attachable-link';
      }
      default: {
        return base + '/feed';
      }
    }
  }

  function generateGlammerQueryParams(options) {
    const cfg = (options && options.config) || {};
    const url = options && options.feedType === 'open-graph' && options.objectProperties && options.objectProperties.url;

    const queryParams = [
      { key: 'code', value: '6' },
      ...(options && options.network ? [{ key: 'network', value: options.network }] : []),
      ...(options && options.network_permalink ? [{ key: 'network_permalink', value: options.network_permalink }] : []),
      ...(options && options.broadcastId ? [{ key: 'broadcastId', value: options.broadcastId }] : []),
      ...(cfg.promptText ? [{ key: 'promptText', value: cfg.promptText }] : []),
      ...(cfg.defaultGroupId ? [{ key: 'defaultGroupId', value: cfg.defaultGroupId }] : []),
      ...(cfg.theme ? [{ key: 'theme', value: cfg.theme }] : []),
      ...('header' in cfg ? [{ key: 'header', value: cfg.header.toString() }] : []),
      ...('footer' in cfg ? [{ key: 'footer', value: cfg.footer.toString() }] : []),
      ...('hideNetworkName' in cfg ? [{ key: 'hideNetworkName', value: cfg.hideNetworkName.toString() }] : []),
      ...('defaultToCanonical' in cfg ? [{ key: 'defaultToCanonical', value: cfg.defaultToCanonical.toString() }] : []),
      ...('use_sso' in cfg ? [{ key: 'use_sso', value: cfg.use_sso.toString() }] : []),
      ...('full_realtime_activation' in cfg ? [{ key: 'full_realtime_activation', value: cfg.full_realtime_activation.toString() }] : []),
      ...('showOpenGraphPreview' in cfg ? [{ key: 'showAttachableLinkPreview', value: cfg.showOpenGraphPreview.toString() }] : []),
      ...(cfg.includeFeedInformation !== undefined ? [{ key: 'includeFeedInformation', value: cfg.includeFeedInformation.toString() }] : []),
      ...(url ? [{ key: 'url', value: url }] : []),
    ];

    return queryParams.reduce(function (queryParamsString, param) {
      const queryParamString = encodeURIComponent(param.key) + '=' + encodeURIComponent(param.value);
      return queryParamsString ? queryParamsString + '&' + queryParamString : '?' + queryParamString;
    }, '');
  }
  // --- end copied helpers ---

  // Note: no postMessage integration for this legacy glammer embed; helper omitted.

  function createIframe(options) {
    options = options || {};
    const style = options.style || defaultStyle;

    const iframe = document.createElement('iframe');
    iframe.id = options.id;
    iframe.name = options.name || options.id;
    iframe.frameBorder = 'none';
    iframe.scrolling = 'no';
    iframe.tabIndex = '0';
    iframe.title = 'Glammer';

    Object.keys(style || {}).forEach(function (p) {
      if (Object.prototype.hasOwnProperty.call(style, p)) {
        iframe.style[p] = style[p];
      }
    });

    // avoid mixed-content or blank-src issues on some browsers
    iframe.src = 'javascript://';
    return iframe;
  }

  function getContainer(selector) {
    let container = selector || document.body;
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    if (!container) {
      log('Could not find container to embed glammer in');
      return null;
    }
    return container;
  }

  // Minimal Glammer-only embed for customers who have not migrated to engage.cloud.
  // This will only create an iframe and point it to the Glammer URL. It intentionally
  // avoids the richer postMessage integration used by the newer embed.
  function embedFeed(options) {
    let container;
    let iframe;
    try {
      options = options || {};
      container = getContainer(options.container);
      if (!container) { return; }
    } catch (err) {
      console.error('Error finding container to embed glammer in', err);
      return;
    }

    try {
      iframe = createIframe({ id: 'embed-feed-glammer' });
      iframe.className = 'yj-embed-widget yj-embed-feed glammer-legacy-embed';
      // !! not sure about this
      // size the iframe to the container by default; callers can override via CSS
      // iframe.style.width = container.clientWidth + 'px';
      // iframe.style.height = container.clientHeight + 'px';
      container.appendChild(iframe);
    } catch (err) {
      console.error('Error creating glammer iframe', err);
      return;
    }

    try {
      options = options || {};
      if (options.network) { options.network_permalink = options.network; }
      // add a timestamp to help bust caches if needed
      options.bust = options.bust || Date.now().toString();

      iframe.src = generateGlammerUrlWithQueryParams(options);
    } catch (err) {
      console.error('Error setting glammer iframe src', err);
    }
  }

  // Expose under yam.connect so it can be swapped in for legacy customers
  yam.connect = yam.connect || {};
  yam.connect.embedFeed = embedFeed;
}());
