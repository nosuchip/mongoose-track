const diffCheck = require('deep-diff').diff;
const merge = require('deepmerge');
const mongoose = require('mongoose');
const _get = require('lodash.get');
const _set = require('lodash.set');

const mongooseTrack = {};
mongooseTrack._options = {
  track: {
    N: true,
    E: true,
    D: true,
    A: true
  },
  author: {
    enable: false,
    type: '',
    ref: ''
  }
};
mongooseTrack.options = merge(mongooseTrack._options, {});

mongooseTrack.historySchema = function(schema, options) {
  let self = { history: [{}] };

  if (options.author.enable === true) {
    self.history[0].author = { type: options.author.type, ref: options.author.ref, historyIgnore: true };
  }

  self.history[0].date = { type: Date };
  self.history[0].changes = [{}];
  self.history[0].changes[0].type = { type: String };
  self.history[0].changes[0].path = { type: [String] };
  self.history[0].changes[0].before = { type: mongoose.Schema.Types.Mixed };
  self.history[0].changes[0].after = { type: mongoose.Schema.Types.Mixed };
  self.history[0].changes[0].item = { type: mongoose.Schema.Types.Mixed };

  return self;
};

mongooseTrack.historyAuthorSchema = function(schmea, options) {
  let self = {};

  if (options.author.enable === true) {
    self = { historyAuthor: { type: options.author.type, ref: options.author.ref, historyIgnore: true } };
  }

  return self;
};

mongooseTrack.historyEvent = function(schema, options, _document, document) {
  let self = {};

  let diffArray = diffCheck(_document || {}, document);

  if (!diffArray || diffArray.length <= 0) {
    return;
  }

  self.date = new Date();
  self.author = options.author.enable && document.historyAuthor ? document.historyAuthor : undefined;
  self.changes = [];

  function handleN(diff) {
    try {
      if (!options.track.N) return false;

      let schemaProp = _get(schema.tree, (diff.path || []).join('.')) || {};
      if (schemaProp.historyIgnore) return false;

      delete diff.rhs._id;
      delete diff.rhs.historyAuthor;
      delete diff.rhs.history;

      self.changes.push({
        path: diff.path,
        type: diff.kind,
        after: diff.rhs
      });
    } catch (error) {
    }
  }

  function handleE(diff) {
    try {
      if (!options.track.E) return false;

      let schemaProp = _get(schema.tree, diff.path.join('.')) || {};
      if (schemaProp.historyIgnore) return false;

      self.changes.push({
        path: diff.path,
        type: diff.kind,
        before: diff.lhs,
        after: diff.rhs
      });
    } catch (error) {

    }
  }

  function handleD(diff) {
    if (options.track.D !== true) return false;

    let schemaProp = _get(schema.tree, diff.path.join('.')) || {};
    if (schemaProp.historyIgnore) return false;

    self.changes.push({
      path: diff.path,
      type: diff.kind,
      before: diff.lhs
    });
  }

  function handleA(diff) {
    try {
      if (!options.track.A) return false;

      let schemaProp = _get(schema.tree, diff.path.join('.')) || {};
      if (schemaProp.historyIgnore) return false;

      self.changes.push({
        path: diff.path,
        type: diff.kind,
        before: _get(_document, diff.path.join('.')),
        after: _get(document, diff.path.join('.'))
      });
    } catch (error) {
    }
  }

  const processedArrays = [];

  for (let i = 0; i < diffArray.length; i++) {
    const diff = diffArray[i];

    if (['_id', '__v', 'history', 'historyAuthor'].indexOf(diff.path[0]) > -1) {
      continue;
    }

    if (processedArrays.indexOf(diff.path[0]) !== -1) continue;

    if (diff.kind === 'N') {
      handleN(diff);
    } else if (diff.kind === 'E') {
      handleE(diff);
    } else if (diff.kind === 'D') {
      handleD(diff);
    } else if (diff.kind === 'A') {
      handleA(diff);
      processedArrays.push(diff.path[0]);
    }
  }

  return self.changes.length > 0 ? self : {};
};

const modelInit = function() {
  let document = this;
  document._original = document.toObject();
};

const modelPreSave = function(schema, options) {
  return function(next) {
    let document = this;
    let historyEvent = mongooseTrack.historyEvent(schema, options, document._original, document.toObject());
    if (historyEvent) {
      document.history.unshift(historyEvent);
    }

    delete document.historyAuthor;

    next();
  };
};

const modelPostSave = function(schema, options) {
  return function(doc, next) {
    this._original = this.toObject();

    next();
  };
};

const historyRevise = function(query, deepRevision) {
  let document = this;

  if (Object.prototype.toString.call(query) === '[object Date]') {
    return historyRevise._date(document, query, deepRevision);
  } else {
    return historyRevise._id(document, query, deepRevision);
  }
};

historyRevise._id = function(document, eventId, deepRevision) {
  let historyEventArray;
  historyEventArray = document.history.filter(function(historyEvent) {
    return historyEvent._id === eventId;
  });

  let historyChangeEvent;
  document.history.forEach(function(historyEvent) {
    historyChangeEvent = historyEvent.changes.filter(function(historyChangeEvent) {
      return historyChangeEvent._id === eventId;
    })[0] || historyChangeEvent;
  });

  if (historyEventArray.length > 0) {
    return historyRevise._historyEventArray(document, historyEventArray, deepRevision);
  }
  if (historyChangeEvent) {
    _set(document, historyChangeEvent.path.join('.'), historyChangeEvent.after);
  }

  return document;
};

historyRevise._date = function(document, date, deepRevision) {
  let historyEventArray;
  historyEventArray = document.history.filter(function(historyEvent) {
    return historyEvent.date <= date;
  });

  if (historyEventArray.length > 0) {
    return historyRevise._historyEventArray(document, historyEventArray, deepRevision);
  }

  return document;
};

historyRevise._historyEventArray = function(document, historyEventArray, deepRevision) {
  if (deepRevision !== true) {
    historyEventArray = historyEventArray.slice(0, 1);
  }
  historyEventArray.reverse().forEach(function(historyEvent) {
    historyEvent.changes.forEach(function(historyChangeEvent) {
      _set(document, historyChangeEvent.path.join('.'), historyChangeEvent.after);
    });
  });
  return document;
};

const historyForget = function(eventId, single) {
  let document = this;

  let historyEvent;
  historyEvent = document.history.filter(function(historyEvent) {
    return historyEvent._id === eventId;
  })[0];

  if (!historyEvent) {
    return document;
  }
  if (historyEvent) {
    let amount = single ? 1 : document.history.length - 1;

    let indexes = document.history.map(function(historyEvent, index) {
      return Boolean(historyEvent._id === eventId);
    });

    document.history.splice(indexes.indexOf(true), amount);

    return document;
  }
};

const historyFind = function(query) {
  let _query = merge(query, {});
  if (query.$revision) {
    delete query.$revision;
  }
  if (query.$deepRevision) {
    delete query.$deepRevision;
  }
  return this.find(query)
    .then(function(documentArray) {
      if (_query.$revision) {
        documentArray.forEach(function(document) {
          historyRevise._date(document, _query.$revision, _query.$deepRevision || false);
        });
      }
      return documentArray;
    });
};

const historyFindOne = function(query) {
  let _query = merge(query, {});
  if (query.$revision) {
    delete query.$revision;
  }

  if (query.$deepRevision) {
    delete query.$deepRevision;
  }

  return this.findOne(query)
    .then(function(document) {
      if (_query.$revision) {
        historyRevise._date(document, _query.$revision, _query.$deepRevision || false);
      }
      return document;
    });
};

mongooseTrack.plugin = function(schema, optionOverride) {
  let options = merge(mongooseTrack._options, mongooseTrack.options, optionOverride);

  schema.add(mongooseTrack.historySchema(schema, options));
  schema.add(mongooseTrack.historyAuthorSchema(schema, options));

  schema.statics.historyFind = historyFind;
  schema.statics.historyFindOne = historyFindOne;

  schema.methods.historyRevise = historyRevise;
  schema.methods.historyForget = historyForget;

  schema.post('init', modelInit);
  schema.pre('save', modelPreSave(schema, options));
  schema.post('save', modelPostSave(schema, options));
};

module.exports = mongooseTrack;
