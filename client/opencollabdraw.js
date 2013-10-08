
var OpenCollabDraw = function( container, height, width, websocketAddr )
{
	if( container === undefined || height === undefined || width === undefined )
	{
		console.error('missing parameters');
		return;
	}

	container = container.replace('#','');
	if( !document.getElementById(container) )
	{
		console.error('canvas element #'+container+' doesnt exists');
		return;
	}
	
	this._container = container;
	this._height = height;
	this._width = width;
	this._websocketAddr = websocketAddr || this._websocketAddr;
}

OpenCollabDraw.prototype = {

	_websocketAddr: 'http://localhost',
	
	// Spline configuration
	_curStrokeColor: 'blue',
	_strokeWidth: 5,
	_lineCap: 'round',
	_splineTension: 0.5,
	
	_ChatSelfId: 'me',
	
	IsDrawing: false,
	NewDrawing: true,
	
	_CheckDep: function()
	{
		if( !Kinetic )
		{
			console.error('kineticjs is not loaded');
			return false;
		}
		
		if( !io )
		{
			console.error( 'socket.io is not loaded' );
			return false;
		}
		return true;
	},
	
	_AddChatMessage: function( who, msg )
	{
		var html = this._ChatContainer.innerHTML;
		html += '<br />' + (who+':').bold() + msg;
		this._ChatContainer.innerHTML = html;
		
		if( who == this._ChatSelfId )
			this._socket.emit('ChatMsg', { who: this._Nickname, msg: msg } );
			
		this._ChatContainer.scrollTop = this._ChatContainer.scrollHeight;
	},
	
	SetColor: function( color )
	{
		this._curStrokeColor = color;
		this._socket.emit('Color', color );
	},
	
	_InitChat: function( cnf )
	{
		var self = this;
		this._Nickname = cnf.Nickname;
		this._ChatContainer = document.getElementById( cnf.ChatContainer );
		this._ChatInput = document.getElementById( cnf.ChatInput );
		
		this._ChatInput.addEventListener( 'keypress',
			function(evt)
			{
				if( evt.keyCode == 13 )
				{
					var msg = this.value;
					this.value = '';
					self._AddChatMessage( self._ChatSelfId , msg );
					evt.preventDefault();
				}
				return true;
			}
		);
		
		this._socket.emit('ChatJoin', this._Nickname );
		
		this._socket.on('ChatMsg', 
			function( data )
			{
				self._AddChatMessage( data.who, data.msg );
			}
		);
		
	},

	Init: function( config )
	{
		if( !this._CheckDep() ) return;
		var self = this;
		if( !config ) config = {};
		config.EnableChat = config.EnableChat || false;
		
		this.stage = new Kinetic.Stage({
			container: this._container,
			width: this._height,
			height: this._width
		});
	
		this.layer = new Kinetic.Layer();
		this.stage.add( this.layer );
		this.stage._mousedown = function(){};
		var board = document.getElementById( this._container );
		
		board.addEventListener( 'mousedown',
			function(evt)
			{
				if( evt.button == 0 )
					self.IsDrawing = true;
			}
		);
		
		board.addEventListener( 'mouseup',  
			function(evt)
			{
				if( evt.button == 0 )
				{
					self.IsDrawing = false;
					self.NewDrawing = true;
				}
			}
		);
		
		this._drawerInterval = setInterval( function(){ self.Drawer(); } , 1000/20 );
		this._updateInterval = setInterval( function(){ self.layer.draw(); } , 1000/60 );
		
		this._socket = io.connect( this._websocketAddr );
		
		if( config.EnableChat )
		{
			if( !config.Nickname || !config.ChatContainer || !config.ChatInput )
				console.error('chat system requires Nickname, ChatContainer and ChatInput');
				
			this._InitChat( config );
		}
		
		this._socket.on('Spline',
			function (data)
			{
				var spline = new Kinetic.Spline({
					points: [ data ],
					stroke: data.color,
					strokeWidth: self._strokeWidth,
					lineCap: self._lineCap,
					tension: self._splineTension,
					id: data.id
				});
				self.layer.add( spline );
			}
		);
		
		this._socket.on('Point', 
			function (data)
			{
				var spline = self.stage.find('#'+data.id)[0];
				var r = spline.getPoints();
				r.push( data );
				spline.setPoints( r );
			}
		);
		
	},
	
	Drawer: function()
	{
		if( !this.IsDrawing ) return;
		
		var pos = this.stage.getMousePosition();
		
		if( this.NewDrawing )
		{
			this._curSpline = new Kinetic.Spline({
				points: [ pos ],
				stroke: this._curStrokeColor,
				strokeWidth: this._strokeWidth,
				lineCap: this._lineCap,
				tension: this._splineTension
			});
			this.NewDrawing = false;
			this.layer.add( this._curSpline );
			this._socket.emit('Spline', pos );
		}
		else
		{
			var r = this._curSpline.getPoints();
			r.push( pos );
			this._curSpline.setPoints( r );
			this._socket.emit('Point', pos );
		}
	},
	
	

};

