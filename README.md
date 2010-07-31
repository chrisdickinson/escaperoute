Escaperoute
=========================

man, I sure do love writing things for node.js! It's pretty fun. It's also four AM and I should be in bed.

Escaperoute is my stab at URL routing for node.js:

    // set up your routes

    var escaperoute = require('escaperoute'),
        url = escaperoute.url,
        surl = escaperoute.surl,
        routes = escaperoute.routes;

    var urls = routes('',
        url('^say_hello', function() { return arguments.length; }),
        url('^builtinfunction', 'path.join'),
        url('^archive/', 'archives.urls'),
        surl('^(:d{4})/(:w{3})/(:d{1,2})/([:d:w\\-]+)', function(req, resp, year, month, day, slug) { 
            return [year, month, day];
        }, 'detail-view')
    );

    // first example
    var result = urls.match('say_hello');       // --> Function
    result();                                   // --> "0" 
    result(1,2,3);                              // --> "3"
    

    // second example
    var result = urls.match('builtinfunction'); // --> Function
    result("hey","there");                      // --> "hey/there", same as `path.join("hey", "there")`

    // third result
    var result = urls.match('archive/2006');    // --> Function from a nested instance of `routes`

    // fourth, assuming you're within a node.js server
    var result = urls.match('2004/jan/3/hey-guys');
    result(request, response);                  // --> [2004, 'jan', 3]

    var reverse = urls.reverse('detail-view', [2000, 'mar', 23, 'yeah-yeah']);  // --> 2000/mar/23/yeah-yeah
    reverse = urls.reverse('detail-view', [200, 'mar', 23, 'way-old'])          // THROWS NoReverseMatch Error
