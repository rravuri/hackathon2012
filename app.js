var http = require('http');
var url=require('url');
var util=require('util');
var fs=require('fs');
var journey = require('journey');
var router = new(journey.Router);

var extrahtml = fs.readFileSync('./panelhtml.html') + "</body>";
var csahtml = fs.readFileSync('./csa.html')
var users={};
users["rakesh"]={friends:["shreeman","bharat"],status:"",url:"",collection:[]};
users["shreeman"]={friends:["rakesh"],status:"",url:"",collection:[]};
users["bharat"]={friends:["rakesh"],status:"",url:"",collection:[]};
users["csa"]={friends:["rakesh","shreeman","bharat"],status:"",url:"",collection:[]};

var userimages = {};
var usermsgs = {};
usermsgs["rakesh"] = { msgs: [] };
usermsgs["bharat"] = { msgs: [] };
usermsgs["shreeman"] = { msgs: [] };
usermsgs["csa"] = { msgs: [] };

http.createServer(function(request, response) {
  var oheaders=request.headers;
  oheaders['accept-encoding']='gzip;q=0';
  var url=request.url;
  var proxy;
  if (url.indexOf('http://www.tesco.com/chat/')!=-1)
  {
	oheaders['host']="127.0.0.1";
	url=url.replace(/www.tesco.com\/chat/gi,"127.0.0.1:8880");
	proxy = http.createClient(8880, request.headers['host'])
  }
  else
  {
	proxy = http.createClient(80, request.headers['host'])
  }
  var proxy_request = proxy.request(request.method, url, oheaders);
  proxy_request.addListener('response', function (proxy_response) {
    proxy_response.addListener("error",function(e){
		util.log('problem with request: ' + e.message);
	});
    if( proxy_response.headers['content-type']!=undefined
		&& proxy_response.headers['content-type'].indexOf('text/html')>=0){
	
        //filter headers
        var headers = proxy_response.headers;       
        var buffer = [];
        //buffer answer
        proxy_response.addListener('data', function(chunk) {
          buffer.push(chunk.toString('utf-8'));
        });
        proxy_response.addListener('end', function() {
		  var resp=buffer.join("");
		  resp=resp.replace("</body>",extrahtml);
		  util.log(request.method+" : "+ request.url);
		  util.log("content-type: "+proxy_response.headers['content-type']);
          util.log("content-length: "+resp.length);
          headers['content-length'] = resp.length;//cancel transfer encoding "chunked"
		  headers['Access-Control-Allow-Origin']="*";
          response.writeHead(proxy_response.statusCode, headers);
          response.write(resp, 'utf-8');
          response.end();
		  buffer=[];
		  resp="";
        });
    } else {
        //send headers as received
        response.writeHead(proxy_response.statusCode, proxy_response.headers);
        //easy data forward
        proxy_response.addListener('data', function(chunk) {
          response.write(chunk, 'binary');
        });
        proxy_response.addListener('end', function() {
          response.end();
        });
    }
  });
  request.addListener('data', function(chunk) {
    proxy_request.write(chunk, 'binary');
  });
  request.addListener('end', function() {
    proxy_request.end();
  });
  request.addListener('error', function(e) {
    util.log('problem with request: ' + e.message);
  });
}).listen(8080);
console.log('proxy server running at http://127.0.0.1:8080/');


router.get('/user').bind(function(req,res,params){
	if (params.name==undefined || users[params.name.toLocaleLowerCase()]==undefined)
	{
		res.send(404,{},{error:"Not found"});
	}
	else if (params.callback!=undefined)
	{
		res.sendBody(params.callback+"("+
			JSON.stringify(users[params.name.toLocaleLowerCase()])+")");
	}
	else
	{
		res.sendBody(JSON.stringify(users[params.name.toLocaleLowerCase()]));
	}
});

router.get('/addtocollection').bind(function(req,res,params){
	if (params.name==undefined || users[params.name.toLocaleLowerCase()]==undefined)
	{
		res.send(404,{},{error:"Not found"});
	}
	else if (params.item==undefined)
	{
		res.send(404,{},{error:"item name not specified"});
	}
	else if (params.url==undefined)
	{
		res.send(404,{},{error:"item url not specified"});
	}
	else if (params.callback!=undefined)
	{
		users[params.name.toLocaleLowerCase()].collection.push({name:params.item,url:params.url});
		res.sendBody(params.callback+"("+
			JSON.stringify(users[params.name.toLocaleLowerCase()])+")");
	}
	else
	{
		users[params.name.toLocaleLowerCase()].collection.push({name:params.item,url:params.url});
		res.sendBody(JSON.stringify(users[params.name.toLocaleLowerCase()]));
	}
});

router.post('/userpage').bind(function(req,res,params){
	if (params.name==undefined)
	{
		res.send(404,{},{error:"Not found"});
	}
	else if (params.callback!=undefined)
	{
		userimages[params.name.toLocaleLowerCase()]={data:params.data,title:params.title,url:params.url};
		res.sendBody(params.callback+"("+
			JSON.stringify({})+")");
	}
	else
	{
		userimages[params.name.toLocaleLowerCase()]={data:params.data,title:params.title,url:params.url};
		res.sendBody(JSON.stringify({}));
	}
});

router.get('/getuserpage').bind(function(req,res,params){
	if (params.name==undefined || userimages[params.name.toLocaleLowerCase()]==undefined)
	{
		res.send(404,{},{error:"Not found"});
	}
	else if (params.callback!=undefined)
	{
		res.sendBody(params.callback+"("+
			JSON.stringify(userimages[params.name.toLocaleLowerCase()])+")");
	}
	else
	{
		res.sendBody(JSON.stringify(userimages[params.name.toLocaleLowerCase()]));
	}
});

router.get('/addfriends').bind(function(req,res,params){
	if (params.name==undefined || users[params.name.toLocaleLowerCase()]==undefined)
	{
		res.send(404,{},{error:"Not found"});
	}
	else if (params.friends==undefined || users[params.friends.toLocaleLowerCase()]==undefined)
	{
		res.send(404,{},{error:"Not found"});
	}
	else if (params.callback!=undefined)
	{
		users[params.name.toLocaleLowerCase()].friends.push(params.friends.split(","));
		res.sendBody(params.callback+"("+
			JSON.stringify(users[params.name.toLocaleLowerCase()])+")");
	}
	else
	{
		res.sendBody(JSON.stringify(users[params.name.toLocaleLowerCase()]));
	}
});

router.get('/send').bind(function(req,res,params){
	if (params.from==undefined || users[params.from.toLocaleLowerCase()]==undefined)
	{
		res.send(404,{},{error:"'from' user Not found"});
	}
	else if (params.to==undefined || users[params.to.toLocaleLowerCase()]==undefined)
	{
		res.send(404,{},{error:"'to' user Not found"});
	}
	else if (params.msg==undefined)
	{
		res.send(404,{},{error:"'msg' Not found"});
	}
	else if (params.callback!=undefined) 
    {
		usermsgs[params.to.toLocaleLowerCase()].msgs.push({from:params.from,to:params.to,msg:params.msg});
		usermsgs[params.from.toLocaleLowerCase()].msgs.push({from:params.from,to:params.to,msg:params.msg});
		res.sendBody(params.callback+"("+
			JSON.stringify(usermsgs[params.from.toLocaleLowerCase()])+")");
	}
	else
	{
		usermsgs[params.to.toLocaleLowerCase()].msgs.push({from:params.from,to:params.to,msg:params.msg});
		usermsgs[params.from.toLocaleLowerCase()].msgs.push({from:params.from,to:params.to,msg:params.msg});
		res.sendBody(JSON.stringify(usermsgs[params.from.toLocaleLowerCase()]));
	}
});
router.get('/getusrmsgs').bind(function(req,res,params){
    if (params.name==undefined || usermsgs[params.name.toLocaleLowerCase()]==undefined)
	{
		res.send(404,{},{error:"Not found"});
	}
	else if (params.callback!=undefined)
	{
		res.sendBody(params.callback+"("+
			JSON.stringify(usermsgs[params.name.toLocaleLowerCase()])+")");
	}
	else
	{
		res.sendBody(JSON.stringify(usermsgs[params.name.toLocaleLowerCase()]));
	}
});
http.createServer(function (req, res) {
    //util.log(req.url);
    var contentTypesByExtension = {
        'html': "text/html",
        'js': "text/javascript",
        'png': "image/png"
    };
    var urldetails = url.parse(req.url, true);
    var body = "";
    req.addListener('data', function (chunk) { body += chunk });
    req.addListener('end', function () {
        if (urldetails.pathname == "/csa") {
            //res.writeHead(200, [{ "content-type": "text/html"}]);
            res.end(csahtml);
        }
        else {
            //
            // Dispatch the request to the router
            //
            router.handle(req, body, function (result) {
                res.writeHead(result.status, result.headers);
                res.end(result.body);
            });
        }
    });

}).listen(8880, '127.0.0.1');
console.log('Chat Server running at http://127.0.0.1:8880/');

http.createServer(function (req, res) {
	var contentTypesByExtension = {
		'html': "text/html",
		'js': "text/javascript",
		'png': "image/png"
	};
	util.log(req.url);
	var urldetails=url.parse(req.url,true);
	var body = "";
    req.addListener('data', function (chunk) { body += chunk });
    req.addListener('end', function () {
			var filename="."+urldetails.pathname;
			fs.readFile(filename, function (err, data) {
				if (err) 
				{
					res.writeHead(404, {});
					res.end("");
					return;
				}
				var vals=urldetails.pathname.split('.');
				var contenttype=contentTypesByExtension[vals[vals.length-1]] || 'text/plain';
				res.writeHead(200, {"content-type":contenttype});
				res.end(data);
			});
    });
  
}).listen(8881, '127.0.0.1');
console.log('asset server running at http://127.0.0.1:8881/');
