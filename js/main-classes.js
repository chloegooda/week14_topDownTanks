// classes file

// TODO make turret rotate around a certain point

class TankBase {
	constructor(scene, x, y, texture, frame) {
		this.scene = scene;
		this.tracks = scene.physics.add.sprite(x, y, texture, 'shadow');
		this.tracks.setDepth(1);
		this.hull = scene.physics.add.sprite(x, y, texture, frame);
		this.hull.body.setSize(this.hull.width - 8, this.hull.height - 8);
		this.hull.body.collideWorldBounds = true;
		this.hull.body.bounce.setTo(1, 1);
		this.hull.setDepth(2);
		this.turret = scene.physics.add.sprite(x, y, texture, 'turret'); // y - 10 here
		this.turret.setDepth(4);
		this.damageCount = 0;
		this.damageMax = 40;
	}

	update() {
		this.tracks.x = this.turret.x = this.hull.x;
		this.tracks.y = this.turret.y = this.hull.y;
		this.tracks.rotation = this.hull.rotation;
    }

    setBullets(bullets) {
        this.bullets = bullets;
    }

    enableCollision(destructLayer) {
        this.scene.physics.add.collider(this.hull, destructLayer);
    }

    disable() {
        this.turret.setVisible(false);
        this.hull.setVelocity(0);
        this.hull.body.immovable = true;
    }

    isDestroyed() {
        if (this.damageCount >= this.damageMax) {
            return true
        }
    }
}

class PlayerTank extends TankBase {
	constructor(scene, x, y, texture, frame) {
		super (scene, x, y, texture, frame)
		this.currentSpeed = 0;
		this.keys = scene.input.keyboard.addKeys(
			{
				left: Phaser.Input.Keyboard.KeyCodes.LEFT,
				right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
				up: Phaser.Input.Keyboard.KeyCodes.UP,
				down: Phaser.Input.Keyboard.KeyCodes.DOWN,
				w: Phaser.Input.Keyboard.KeyCodes.W,
				a: Phaser.Input.Keyboard.KeyCodes.A,
				s: Phaser.Input.Keyboard.KeyCodes.S,
				d: Phaser.Input.Keyboard.KeyCodes.D
			}
		);
	}
	update() {
		super.update();
		if (this.keys.up.isDown || this.keys.w.isDown) {
			if (this.currentSpeed < 100) {
				this.currentSpeed += 10;
			}
		} else if (this.keys.down.isDown || this.keys.s.isDown) {
			if (this.currentSpeed > -100) {
				this.currentSpeed -= 10;
			}
		} else {
			this.currentSpeed *= 0.9;
		}
		if (this.keys.left.isDown || this.keys.a.isDown) {
			if (this.currentSpeed > 0) {
				this.hull.angle--
			} else {
				this.hull.angle++
			}
		} else if (this.keys.right.isDown || this.keys.d.isDown) {
			if (this.currentSpeed > 0) {
				this.hull.angle++
			} else {
				this.hull.angle--
			}
		}
        this.scene.physics.velocityFromRotation(this.hull.rotation, this.currentSpeed, this.hull.body.velocity);
        const worldPoint = this.scene.input.activePointer.positionToCamera(this.scene.cameras.main);
		this.turret.rotation = Phaser.Math.Angle.Between(this.turret.x, this.turret.y, worldPoint.x, worldPoint.y);
    }

    damage() {
        this.damageCount++;
    }
}

class EnemyTank extends TankBase {
    constructor(scene, x, y, texture, frame) {
        super(scene, x, y, texture, frame);
        this.player = player;
        this.hull.angle = Phaser.Math.RND.angle();
        this.scene.physics.velocityFromRotation(this.hull.rotation, 100, this.hull.body.velocity);
        this.damageMax = Phaser.Math.RND.between(2, 5);
        this.fireTime = 0;
    }

    update(time, delta) {
        super.update();
        this.turret.rotation = Phaser.Math.Angle.Between(this.hull.x, this.hull.y, this.player.hull.x, this.player.hull.y);
        this.tracks.rotation = this.hull.rotation = Math.atan2(this.hull.body.velocity.y, this.hull.body.velocity.x);
        if (this.damageCount <= this.damageMax - 2 && Phaser.Math.Distance.Between(this.hull.x, this.hull.y, this.player.hull.x, this.player.hull.y) < 300) {
            if (time > this.fireTime + 500) {
                this.fireTime = time;
                var bullet = this.bullets.get(this.turret.x, this.turret.y);
                if (bullet) {
                    fireBullet.call(this.scene, bullet, this.turret.rotation, this.player);
                }
            }
        }
    }

    damage() {
        this.damageCount++;
        if (this.damageCount >= this.damageMax) {
            this.turret.destroy();
            this.hull.destroy();
        } else if (this.damageCount == this.damageMax - 1) {
            this.disable();
        }
    }

    disable() {
        this.turret.setVisible(false);
        this.hull.body.velocity.x *= 0.01;
        this.hull.body.velocity.y *= 0.01;
    }
}