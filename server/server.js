var express = require('express'),
    http = require('http');

var app = express();
var server = http.createServer(app).listen( process.env.OPENSHIFT_NODEJS_PORT || 80, 
											process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1' );

var io = require('socket.io').listen(server);

io.configure(function(){
    io.set("transports", ["websocket"]);
});

app.use('/', express.static( '../client' ) );

io.sockets.on('connection', Connection );

var SplineId = 0;

function Connection(socket)
{
	// set default color
	socket.set('Color', 'blue', function () {} );
	
	// set current color
	socket.on('Color', function(data)
	{
		socket.set('Color', data, function(){} );
	});
	
	// add point to spline
	socket.on('Point', function (data) 
	{
		socket.get('SplineId', 
			function(err, splineid)
			{
				data.id = splineid;
				socket.broadcast.emit('Point', data );
			}
		);
		
	});
	
	// start drawing new spline
	socket.on('Spline', function (data) 
	{
		socket.get('Color', 
			function (err, color) 
			{
				data.color = color;
				data.id = SplineId;
				socket.set('SplineId', SplineId, function(){ SplineId++; } );
				socket.broadcast.emit('Spline', data );
			}
		);
	});
	
	// chat message
	socket.on('ChatMsg', function(data)
	{
		socket.broadcast.emit( 'ChatMsg', data );
	});
}