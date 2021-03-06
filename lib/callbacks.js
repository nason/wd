var utils = require("./utils"),
    newError = utils.newError,
    getJsonwireError = utils.getJsonwireError,    
    isWebDriverException = utils.isWebDriverException;

var cbStub = function() {};

// just calls the callback when there is no result
exports.simpleCallback = function(cb) {
  cb = cb || cbStub;
  return function(err, data) {
    if(err) { return cb(err); }
    if((data === '') || (data === 'OK')) {
      // expected behaviour when not returning JsonWire response
      cb(null);
    } else {
      // looking for JsonWire response
      var jsonWireRes;
      try{jsonWireRes = JSON.parse(data);}catch(ign){}
      if (jsonWireRes && (jsonWireRes.sessionId) && (jsonWireRes.status !== undefined)) {
        // valid JsonWire response
        if(jsonWireRes.status === 0) {
          cb(null);
        } else {
          var error = newError(
            { message:'Error response status: ' + jsonWireRes.status +  '.'
              , status:jsonWireRes.status
              , cause:jsonWireRes });
          var jsonwireError  = getJsonwireError(jsonWireRes.status);
          if(jsonwireError){ error['jsonwire-error'] = jsonwireError; }
          cb(error);
        }
      } else {
        // something wrong
        cb(newError(
          {message:'Unexpected data in simpleCallback.', data: jsonWireRes || data}) );
      }
    }
  };
};

// base for all callback handling data
var callbackWithDataBase = function(cb) {
  cb = cb || cbStub;
  return function(err, data) {
    if(err) { return cb(err); }
    var obj,
        alertText;
    try {
      obj = JSON.parse(data);
    } catch (e) {
      return cb(newError({message:'Not JSON response', data:data}));
    }
    try {
        alertText = obj.value.alert.text;
    } catch (e) {
        alertText = '';
    }
    if (obj.status > 0) {
      var error = newError(
        { message:'Error response status: ' + obj.status + '. ' + alertText
          , status:obj.status
          , cause:obj });
      var jsonwireError  = getJsonwireError(obj.status);
      if(jsonwireError){ error['jsonwire-error'] = jsonwireError; }
      cb(error);
    } else {
      cb(null, obj);
    }
  };
};

// retrieves field value from result
exports.callbackWithData = function(cb, browser) {
  cb = cb || cbStub;
  return callbackWithDataBase(function(err,obj) {
    if(err) {return cb(err);}
    if(isWebDriverException(obj.value)) {return cb(newError(
      {message:obj.value.message,cause:obj.value}));}
    // we might get a WebElement back as part of executeScript, so let's
    // check to make sure we convert if necessary to element objects
    if(obj.value !== null && typeof obj.value.ELEMENT !== "undefined") {
        obj.value = browser.newElement(obj.value.ELEMENT);
    } else if (Object.prototype.toString.call(obj.value) === "[object Array]") {
        for (var i = 0; i < obj.value.length; i++) {
            if (obj.value[i] !== null && typeof obj.value[i].ELEMENT !== "undefined") {
                obj.value[i] = browser.newElement(obj.value[i].ELEMENT);
            }
        }
    }
    cb(null, obj.value);
  });
};

// retrieves ONE element
exports.elementCallback = function(cb, browser) {
  cb = cb || cbStub;
  return callbackWithDataBase(function(err, obj) {
    if(err) {return cb(err);}
    if(isWebDriverException(obj.value)) {return cb(newError(
      {message:obj.value.message,cause:obj.value}));}
    if (!obj.value.ELEMENT) {
      cb(newError(
        {message:"no ELEMENT in response value field.",cause:obj}));
    } else {
      var el = browser.newElement(obj.value.ELEMENT);
      cb(null, el);
    }
  });
};

// retrieves SEVERAL elements
exports.elementsCallback = function(cb, browser) {
  cb = cb || cbStub;
  return callbackWithDataBase(function(err, obj) {
    if(err) {return cb(err);}
    if(isWebDriverException(obj.value)) {return cb(newError(
      {message:obj.value.message,cause:obj.value}));}
    if (!(obj.value instanceof Array)) {return cb(newError(
      {message:"Response value field is not an Array.", cause:obj.value}));}
    var i, elements = [];
    for (i = 0; i < obj.value.length; i++) {
      var el = browser.newElement(obj.value[i].ELEMENT);
      elements.push(el);
    }
    cb(null, elements);
  });
};
