// config
var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: {
                y: 0
            }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);
var player, bullets, enemyTanks = [], maxEnemies = 15, enemyBullets;
var score = 0, scoretext;
var fail = false;

function preload() {
	this.load.atlas('playerTank', 'assets/playerTank.png', 'assets/playerTank.json');
	this.load.atlas('enemyTank', 'assets/enemyTank.png', 'assets/enemyTank.json');
    this.load.image('bullet', 'assets/bullet.png');

    this.load.spritesheet('explosionSmoke', 'assets/explosionSmoke.png', { frameWidth: 60, frameHeight: 60 });
    this.load.spritesheet('explosionFire', 'assets/explosionFire.png', { frameWidth: 60, frameHeight: 60 });

    this.load.image('landscape', 'assets/landscape.png');
    this.load.tilemapTiledJSON('level', 'assets/level.json');
}

function create() {
    // this.add.tileSprite(800, 800, 1600, 1600, 'earth'); // if you want a background image

    this.physics.world.on('worldbounds', function (body) {
        killBullet(body.gameObject);
    }, this)

    this.map = this.make.tilemap({ key: 'level' });
    var landscape = this.map.addTilesetImage('landscape-tiled', 'landscape');
    this.map.createStaticLayer('ground', landscape, 0, 0);
    var destructibleLayer = this.map.createDynamicLayer('destructibles', landscape, 0, 0);
    destructibleLayer.setCollisionByProperty({ collides: true });

    var width = this.map.widthInPixels;
    var height = this.map.heightInPixels;

    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    var outerFrame = new Phaser.Geom.Rectangle(0, 0, width, height);
    var innerFrame = new Phaser.Geom.Rectangle(width * 0.25, height * 0.25, width * 0.5, height * 0.5);

    player = new PlayerTank(this, 200, 200, 'playerTank', 'body');
	console.log(player)
	console.log(player.enableCollision);
    player.enableCollision(destructibleLayer);

    enemyBullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 10
    })

    var enemyTank, loc;
    for (var i = 0; i < maxEnemies; i++) {
        loc = Phaser.Geom.Rectangle.RandomOutside(outerFrame, innerFrame);
        enemyTank = new EnemyTank(this, loc.x, loc.y, 'enemyTank', 'body');
        enemyTank.enableCollision(destructibleLayer);
        enemyTank.setBullets(enemyBullets);
        enemyTanks.push(enemyTank);
        this.physics.add.collider(enemyTank.hull, player.hull);
        if (i > 0) {
            for (var j = 0; j < enemyTanks.length - 1; j++) {
                this.physics.add.collider(enemyTank.hull, enemyTanks[j].hull);
            }
        }
    }

    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 5
    });

    explosionsSmoke = this.physics.add.group({
        defaultKey: 'explosionSmoke',
        maxsize: 10
    });

    explosionsFire = this.physics.add.group({
        defaultKey: 'explosionFire',
        maxsize: 10
    });

    this.anims.create({
        key: 'explodeSmoke',
        frames: this.anims.generateFrameNumbers('explosionSmoke', { start: 0, end: 4 }),
        frameRate: 12
    });

    this.anims.create({
        key: 'explodeFire',
        frames: this.anims.generateFrameNumbers('explosionFire', { start: 0, end: 4 }),
        frameRate: 12
    });

    createScoreText.call(this);

    this.input.on('pointerdown', tryShoot, this);
    this.cameras.main.startFollow(player.hull);
}

function update(time, delta) {
    player.update();
    for (var i = 0; i < enemyTanks.length; i++) {
        enemyTanks[i].update(time, delta);
    }
    scoreText.setDepth(10);
}

// other functions

function createScoreText() {
    scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '30px', fill: '#fff', fontStyle: 'bold', fontFamily: 'Arial' }).setScrollFactor(0);
    scoreText.setOrigin(0);
}

function updateScore(num) {
    score += num;
    scoreText.setText("Score: " + score);
}

function createExplosion(type, targetX, targetY) {
    if (type === 'smoke') {
        var explosionSmoke = explosionsSmoke.get(targetX, targetY);
        if (explosionSmoke) {
            activateExplosion(explosionSmoke);
            explosionSmoke.on('animationcomplete', animComplete, this);
            explosionSmoke.play('explodeSmoke');
        }
    } else {
        var explosionFire = explosionsFire.get(targetX, targetY);
        if (explosionFire) {
            activateExplosion(explosionFire);
            explosionFire.on('animationcomplete', animComplete, this);
            explosionFire.play('explodeFire');
        }
    }
}

function activateExplosion(explosion) {
    explosion.setActive(true);
    explosion.setVisible(true);
    explosion.setDepth(5);
}

function animComplete(animation, frame, gameObject) {
    gameObject.disableBody(true, true);
}

function tryShoot(pointer) {
    var bullet = bullets.get(player.turret.x, player.turret.y);
    if (bullet) {
        fireBullet.call(this, bullet, player.turret.rotation);
    }
}

function fireBullet(bullet, rotation, target) {
    bullet.setDepth(3);
    bullet.body.collideWorldBounds = true;
    bullet.body.onWorldBounds = true;
    bullet.enableBody(false);
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.rotation = rotation;
    this.physics.velocityFromRotation(bullet.rotation, 500, bullet.body.velocity);

    const destructLayer = this.map.getLayer("destructibles").tilemapLayer;
    this.physics.add.collider(bullet, destructLayer, bulletHitWall, null, this);
    if (target === player) {
        this.physics.add.overlap(player.hull, bullet, bulletHitPlayer, null, this);
    } else {
		console.log(bullet);
        for (var i = 0; i < enemyTanks.length; i++) {
            this.physics.add.overlap(enemyTanks[i].hull, bullet, bulletHitEnemy, null, this);
        }
    }
}

function killBullet(bullet) {
    bullet.disableBody(true, true);
    bullet.setActive(false);
    bullet.setVisible(false);
}

function bulletHitWall(bullet, tile) {
    killBullet(bullet);
    const destructibleLayer = this.map.getLayer("destructibles").tilemapLayer;
    var index = tile.index + 1;
    var tileProperties = destructibleLayer.tileset[0].tileProperties[index - 1];
    var checkCollision = false;
    if (tileProperties) {
        if (tileProperties.collides) {
            checkCollision = true;
        }
    }

    if (tile.index === 43) {
        const newTile = destructibleLayer.putTileAt(53, tile.x, tile.y);
        createExplosion('smoke', (32 + (tile.x * 64)), (32 + (tile.y * 64)));
    } else if (tile.index === 46 || tile.index === 49) {
        const newTile = destructibleLayer.putTileAt(54, tile.x, tile.y);
        createExplosion('smoke', (32 + (tile.x * 64)), (32 + (tile.y * 64)));
    } else if (tile.index === 52) {
        const newTile = destructibleLayer.putTileAt(55, tile.x, tile.y);
        createExplosion('smoke', (32 + (tile.x * 64)), (32 + (tile.y * 64)));
    } else {
        const newTile = destructibleLayer.putTileAt(index, tile.x, tile.y);
        if (checkCollision) {
            newTile.setCollision(true);
        }
    }
}

function bulletHitEnemy(hull, bullet) {
    var enemy, index;
    for (var i = 0; i < enemyTanks.length; i++) {
        if (enemyTanks[i].hull === hull) {
            enemy = enemyTanks[i];
            index = i;
            break;
        }
    }
    killBullet(bullet);
    updateScore(2);
    enemy.damage();

    createExplosion('fire', hull.x, hull.y);

    if (enemy.isDestroyed()) {
        enemyTanks.splice(index, 1);
        if (enemyTanks.length === 0) {
            endGame.call(this);
        }
    }
}

function bulletHitPlayer(hull, bullet) {
    killBullet(bullet);
    player.damage();

    if (player.isDestroyed()) {
        for (var i = 0; i < enemyTanks.length; i++) {
            enemyTanks[i].hull.body.setVelocityX(0);
            enemyTanks[i].hull.body.setVelocityY(0);
        }
        player.disable();
        player.hull.setVisible(false);
        // TODO fix shadow to stay on ground and not spin
        player.tracks.setVisible(false);
        createExplosion('fire', hull.x, hull.y);
        this.input.enabled = false;
        this.physics.pause();
        enemyTanks = [];
        fail = true;
        endGame.call(this);
    }
}

function endGame() {
    if (fail === true) {
        // TODO fix overlays
        console.log('red overlay');
        this.add.text(game.config.width / 2 - 150, game.config.height / 2 - 25, 'GAME OVER', { fontSize: '50px', fill: '#fff', fontStyle: 'bold', fontFamily: 'Arial' }).setScrollFactor(0).setDepth(8);
    } else {
        this.input.enabled = false;
        this.physics.pause();
        console.log('green overlay');
        this.add.text(game.config.width / 2 - 125, game.config.height / 2 - 25, 'YOU WIN!', { fontSize: '50px', fill: '#fff', fontStyle: 'bold', fontFamily: 'Arial' }).setScrollFactor(0).setDepth(8);
    }
}