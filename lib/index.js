var NoMatch = function(path, tried) {
    this.path = path;
    this.urlpatterns = tried;
};
NoMatch.prototype = new Error();

var NoReverseMatch = function(path) {
    this.path = path;
};
NoReverseMatch.prototype = new Error();

var ReverseRegex = function(original, tokens, minArgs) {
    this.original = original;
    this.tokens = tokens;
    this.minArgs = minArgs;
};

ReverseRegex.prototype.apply = function(args) {
    if(args.length !== this.minArgs) {
        throw new NoReverseMatch();
    }

    var currentArg = 0,
        token,
        output = [];

    for(var i = 0, len = this.tokens.length; i < len; ++i) {
        token = this.tokens[i];
        if(token.length > 0) {
            output.push(token(args[currentArg++]));
        } else {
            output.push(token());
        }
    }
    return output.join(''); 
};

ReverseRegex.prototype.test = function(args) {
    try {
        this.apply(args);
    } catch(err) {
        if(err instanceof NoReverseMatch) {
            return false;
        } else throw err;
    }
    return true;
};

var createReverseRegex = function(fromSource) {
    fromSource = fromSource.replace(/[\^\$]/g, '');     // get rid of "line begin / line end" indicators
    var tokens = [],
        src = fromSource,
        re = /\((.*?)\)/,
        match,
        groupsToMatch = 0,
        text = function(str) {
            return function () { return str.replace(/(\.|\*|\+|\\\w)/g, ''); };// remove ungrouped regex-ery
        },
        regex = function(exp) {
            ++groupsToMatch;
            return function(value) {
                if((new RegExp('^'+exp+'$')).test(value)) {
                    return value; 
                } else throw new NoReverseMatch();
            };
        };
    while(src.length) {
        match = re.exec(src);
        if(match) {
            tokens.push(text(src.slice(0, match.index)));
            tokens.push(regex(src.slice(match.index, match.index + match[0].length)));
            src = src.slice(match.index + match[0].length);
        } else {
            tokens.push(text(src));
            src = '';
        }
    }
    return new ReverseRegex(fromSource, tokens, groupsToMatch);
};


var Route = function(re, target, name) {
    this.re = new RegExp(re);
    this.target = target;
    this.name = name;
};

Route.prototype.getTarget = function(base_path) {
    if(typeof(this.target) === 'string') {
        var full_path = base_path.length > 0 ? base_path.split('.').concat(this.target.split('.')) : this.target.split('.'),
            app_name = full_path[0],
            rest = full_path.slice(1),
            retval;
        try {
            retval = require(app_name);
        } catch(err) {
            var path = require.paths.join(",\n\t");
            throw new Error('Could not find module "'+app_name+'"!\n\tIs it on path?\n\t'+path);
        }

        try { 
            for(var i = 0, len = rest.length; i < len; ++i) {
                retval = retval[rest[i]];
            }
        } catch(err) {
            throw new Error('Found app named "'+app_name+'", but could not load "'+rest.join('.')+'"!');
        }

        this.target = retval;
    }
    return this.target;
};

var Router = function(base_path, routes, optional_target_object) {
    this.base_path = base_path;
    this.routes = routes;
    this.length = this.routes.length;
    this.reverseMatch = {};
    this.optional_target_object = optional_target_object || {};
};

Router.prototype.reverseMatch = {};

Router.prototype.reverse = function(name, args, source) {
    var target,
        reverseRegex;
    source = source === undefined ? '' : source;

    for(var i = 0; i < this.length; ++i) {
        target = this.routes[i].getTarget(this.base_path);
        if(this.routes[i].name === name) {
            reverseRegex = createReverseRegex(source+this.routes[i].re.source);
            if(reverseRegex.test(args)) {
                Router.prototype.reverseMatch[name] = reverseRegex;
                return reverseRegex.apply(args);
            } else {
                throw NoReverseMatch();
            }
        } else if(target instanceof Router) {
            try {
                return target.reverse(name, args, source+this.routes[i].re.source);
            } catch(err) {
                if(!(err instanceof NoReverseMatch)) {
                    throw err;
                }
            }
        }
    }
    throw new NoReverseMatch();
};

Router.prototype.match = function(path) {
    var match, target, tried = [];

    for(var i = 0; i < this.length; ++i) {
        var src = this.routes[i].re.source;
        match = this.routes[i].re.exec(path);
        tried.push(src);
        if(match) {
            target = this.routes[i].getTarget(this.base_path);
            if(target instanceof Router) {
                try {
                    return target.match(path.slice(match[0].length));
                } catch(err) {
                    if(!err instanceof NoMatch) {
                        throw err;
                    } else {
                        tried = tried.concat(err.urlpatterns.map(function(item) {
                            return [src, item].join(''); 
                        }));
                    }
                }
            } else {
                var target_obj = this.optional_target_object;
                return function() {
                    return target.apply(target_obj, Array.prototype.slice.apply(arguments).concat(match.slice(1)));
                };
            }
        }
    }
    throw new NoMatch(path, tried);
};

Router.prototype.root = function(view404) {
  view404 = view404 || function(request, response) {
    response.writeHead(404, {'Content-Type':'text/html'});
    response.end('<h1>NOT FOUND</h1>');
  };

  return function(request, response) {
    var url = require('url'),
        parsed = url.parse(request.url);

    try {
      this.match(parsed.pathname)(request, response);      
    } catch(err) {
      view404(request, response);
    }
  }.bind(this);
};

exports.url = function (re, target, name) {
    return new Route(re, target, name);
};
exports.surl = function(re, target, name) {
    return new Route(re.replace(/:/g, '\\'), target, name);
};
exports.routes = function(base_path) {
    var routes = Array.prototype.slice.call(arguments, 1);
    return new Router(base_path, routes);
};

exports.Route = Route;
exports.Router = Router;
exports.NoMatch = NoMatch;
exports.NoReverseMatch = NoReverseMatch;
exports.createReverseRegex = createReverseRegex;
