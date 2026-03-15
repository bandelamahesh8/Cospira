mergeInto(LibraryManager.library, {
  PostMessageToParent: function(jsonPtr) {
    var json = UTF8ToString(jsonPtr);
    window.parent.postMessage(JSON.parse(json), "*");
  }
});