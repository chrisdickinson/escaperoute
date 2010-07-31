var escaperoute = require('../lib/escaperoute'),
    assert = require('assert'),
    vows = require('vows'),
    url = escaperoute.url,
    surl = escaperoute.surl;


vows.describe('Route handling').addBatch({
    'Send a path':{
        'to a router with no routes':{
            topic:function() {
                return escaperoute.routes('');
            },
            'raises an escaperoute.NoMatch exception':function(topic) {
                assert.throws(function () { topic.match(Math.random().toString()); }, escaperoute.NoMatch);
            }
        },
        'to a router with existing routes':{
            topic:function() {
                return escaperoute.routes('',
                    url('^asdf/hey', function() { return 'yeah!'; }),
                    surl('^(:d+)/alright', function() { return Array.prototype.slice.call(arguments); })
                );
            },
            'raises an escaperoute.NoMatch exception if none match':function(topic) {
                assert.throws(function () { topic.match(Math.random().toString()); }, escaperoute.NoMatch);
            },
            'returns a closure if path matches':function(topic) {
                var result = topic.match('asdf/hey');
                assert.instanceOf(result, Function);
                assert.equal(result.length, 0);
                assert.equal(result(), 'yeah!');
            },
            'can be matched regex-style':function(topic) {
                var rando = parseInt(Math.random()*100, 10),
                    path = rando.toString()+'/alright',
                    result = topic.match(path);
                assert.instanceOf(result, Function);
                assert.equal(result.length, 0);
                assert.equal(result()[0], rando);
            },
            'can have arguments prepended to the closure':function(topic) {
                var rando = parseInt(Math.random()*100, 10),
                    path = rando.toString()+'/alright',
                    result = topic.match(path),
                    randoIn = parseInt(Math.random()*100, 10);
                assert.instanceOf(result, Function);
                assert.equal(result.length, 0);
                assert.equal(result(randoIn)[0], randoIn);
                assert.equal(result(randoIn)[1], rando);
                assert.equal(result()[0], rando);
            },
        },
        'to a router with a provided path':{
            topic:function() {
                return escaperoute.routes('path',   // path is a node built-in module
                        surl('^([:s:w]+)', 'join')); 
            },
            'will load up the appropriate module and function and delegate to them':function(topic) {
                var result = topic.match("aaa real monsters");
                assert.instanceOf(result, Function);
                assert.equal(result("nooo"), require('path').join('nooo', 'aaa real monsters'));
            },
        },
        'to a router with a module that does not exist':{
            topic:function() {
                return escaperoute.routes('dne.dne.dne',
                    surl('^oh, whatever', 'dne'));
            },
            'will throw a plain error saying, wow, that doesn\'t exist!':function(topic) {
                assert.throws(function() { topic.match(Math.random()); }, Error);
            }
        },
    },
}).run();

