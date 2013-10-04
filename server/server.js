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

var Canvas = {
	Splines: [],
};

var SplineId = 0;

function Connection(socket)
{
	socket.set('Color', 'blue', function () {} );
	
	socket.on('Color', function(data)
	{
		socket.set('Color', data, function(){} );
	});

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
}