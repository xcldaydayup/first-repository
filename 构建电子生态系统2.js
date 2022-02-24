var plan = ["############################",
            "#      #    #      o      ##",
            "#                          #",
            "#          #####           #",
            "##         #   #    ##     #",
            "###           ##     #     #",
            "#           ###      #     #",
            "#   ####                   #",
            "#   ##       o             #",
            "# o  #         o       ### #",
            "#    #                     #",
            "############################"];

function Vector(x, y) {
  this.x = x;
  this.y = y;
}
Vector.prototype.plus = function(other) {
  return new Vector(this.x + other.x, this.y + other.y);
};

function Grid(width, height) {
  this.space = new Array(width * height);
  this.width = width;
  this.height = height;
}
Grid.prototype.isInside = function(vector) {
  return vector.x >= 0 && vector.x < this.width &&
         vector.y >= 0 && vector.y < this.height;
};
Grid.prototype.get = function(vector) {
  return this.space[vector.x + this.width * vector.y];
};
Grid.prototype.set = function(vector, value) {
  this.space[vector.x + this.width * vector.y] = value;
};

var directions = {
  "n":  new Vector( 0, -1),
  "ne": new Vector( 1, -1),
  "e":  new Vector( 1,  0),
  "se": new Vector( 1,  1),
  "s":  new Vector( 0,  1),
  "sw": new Vector(-1,  1),
  "w":  new Vector(-1,  0),
  "nw": new Vector(-1, -1)
};

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

var directionNames = "n ne e se s sw w nw".split(" ");

function BouncingCritter() {
  this.direction = randomElement(directionNames);
};

BouncingCritter.prototype.act = function(view) {
  if (view.look(this.direction) != " ")
    this.direction = view.find(" ") || "s";
  return {type: "move", direction: this.direction};
};

function elementFromChar(legend, ch) {
  if (ch == " ")
    return null;
  var element = new legend[ch]();
  element.originChar = ch;
  return element;
}

function World(map, legend) {
  var grid = new Grid(map[0].length, map.length);
  this.grid = grid;
  this.legend = legend;

  map.forEach(function(line, y) {
    for (var x = 0; x < line.length; x++)
      grid.set(new Vector(x, y),
               elementFromChar(legend, line[x]));
  });
}

function charFromElement(element) {
  if (element == null)
    return " ";
  else
    return element.originChar;
}

World.prototype.toString = function() {
  var output = "";
  for (var y = 0; y < this.grid.height; y++) {
    for (var x = 0; x < this.grid.width; x++) {
      var element = this.grid.get(new Vector(x, y));
      output += charFromElement(element);
    }
    output += "\n";
  }
  return output;
};

function Wall() {}

var world = new World(plan, {"#": Wall,
                             "o": BouncingCritter});
//   #      #    #      o      ##
//   #                          #
//   #          #####           #
//   ##         #   #    ##     #
//   ###           ##     #     #
//   #           ###      #     #
//   #   ####                   #
//   #   ##       o             #
//   # o  #         o       ### #
//   #    #                     #
//   ############################

Grid.prototype.forEach = function(f, context) {
  for (var y = 0; y < this.height; y++) {
    for (var x = 0; x < this.width; x++) {
      var value = this.space[x + y * this.width];
      if (value != null)
        f.call(context, value, new Vector(x, y));
    }
  }
};

World.prototype.turn = function() {
  var acted = [];
  this.grid.forEach(function(critter, vector) {
    if (critter.act && acted.indexOf(critter) == -1) {
      acted.push(critter);
      this.letAct(critter, vector);
    }
  }, this);
};

World.prototype.letAct = function(critter, vector) {
  var action = critter.act(new View(this, vector));
  if (action && action.type == "move") {
    var dest = this.checkDestination(action, vector);
    if (dest && this.grid.get(dest) == null) {
      this.grid.set(vector, null);
      this.grid.set(dest, critter);
    }
  }
};

World.prototype.checkDestination = function(action, vector) {
  if (directions.hasOwnProperty(action.direction)) {
    var dest = vector.plus(directions[action.direction]);
    if (this.grid.isInside(dest))
      return dest;
  }
};

function View(world, vector) {
  this.world = world;
  this.vector = vector;
}
View.prototype.look = function(dir) {
  var target = this.vector.plus(directions[dir]);
  if (this.world.grid.isInside(target))
    return charFromElement(this.world.grid.get(target));
  else
    return "#";
};
View.prototype.findAll = function(ch) {
  var found = [];
  for (var dir in directions)
    if (this.look(dir) == ch)
      found.push(dir);
  return found;
};
View.prototype.find = function(ch) {
  var found = this.findAll(ch);
  if (found.length == 0) return null;
  return randomElement(found);
};
/*for(var i=0;i<10;i++){
   world.turn();
   console.log(world.toString())
}*/
function dirPlus(dir, n) {
  var index = directionNames.indexOf(dir);
  return directionNames[(index + n + 8) % 8];
}

function WallFollower() {
  this.dir = "s";
}

WallFollower.prototype.act = function(view) {
  var start = this.dir;
  if (view.look(dirPlus(this.dir, -3)) != " ")
    start = this.dir = dirPlus(this.dir, -2);
  while (view.look(this.dir) != " ") {
    this.dir = dirPlus(this.dir, 1);
    if (this.dir == start) break;
  }
  return {type: "move", direction: this.dir};
};

function LifelikeWorld(map, legend) {
  World.call(this, map, legend);
}
LifelikeWorld.prototype = Object.create(World.prototype);

var actionTypes = Object.create(null);

LifelikeWorld.prototype.letAct = function(critter, vector) {
  var action = critter.act(new View(this, vector));
  var handled = action &&
    action.type in actionTypes &&
    actionTypes[action.type].call(this, critter,
                                  vector, action);
  if (!handled) {
    critter.energy -= 0.2;
    if (critter.energy <= 0)
      this.grid.set(vector, null);
  }
};

actionTypes.grow = function(critter) {
  critter.energy += 0.5;
  return true;
};

actionTypes.move = function(critter, vector, action) {
  var dest = this.checkDestination(action, vector);
  if (dest == null ||
      critter.energy <= 1 ||
      this.grid.get(dest) != null)
    return false;
  critter.energy -= 1;
  this.grid.set(vector, null);
  this.grid.set(dest, critter);
  return true;
};

actionTypes.eat = function(critter, vector, action) {
  var dest = this.checkDestination(action, vector);
  var atDest = dest != null && this.grid.get(dest);
  if (!atDest || atDest.energy == null)
    return false;
  critter.energy += atDest.energy;
  this.grid.set(dest, null);
  return true;
};


actionTypes.reproduce = function(critter, vector, action) {
  var baby = elementFromChar(this.legend,
                             critter.originChar);
  var dest = this.checkDestination(action, vector);
  if (dest == null ||
      critter.energy <= 2 * baby.energy ||
      this.grid.get(dest) != null)
    return false;
  critter.energy -= 2 * baby.energy;
  this.grid.set(dest, baby);
  return true;
};

function Plant() {
  this.energy = 3 + Math.random() * 4;
}
Plant.prototype.act = function(view) {
  if (this.energy > 15) {
    var space = view.find(" ");
    if (space)
      return {type: "reproduce", direction: space};
  }
  if (this.energy < 20)
    return {type: "grow"};
};

function PlantEater() {
  this.energy = 20;
}
PlantEater.prototype.act = function(view) {
  var space = view.find(" ");
  if (this.energy > 60 && space)
    return {type: "reproduce", direction: space};
  var plant = view.find("*");
  if (plant)
    return {type: "eat", direction: plant};
  if (space)
    return {type: "move", direction: space};
};




/*function Watch(){
  var dir=lookfor("*")
  if (dir)
  return {type:"move",direction:dir}
}
function lookfor(vector,char){
  var view = new View()
  var fangxiang=view.findAll(char)
  if (fangxiang)
  return view.find(char);
  else 
  for (var i=1;i<=12;i++){
     for (var j=0;j<7;j++){
       xunzhao[j]
     }
  }
}
*/
/*function SmartPlanterEater(){
  PlantEater.call(this)

}
SmartPlanterEater.prototype.act=function(views){
  var space = views.find(" ");
  if (this.energy > 63 && space)
    return {type: "reproduce", direction: space};
  var plant = views.find("*")
 if (plant&&this.energy<50)
 return {type:"eat",direction: plant} 
 if (space)
    return {type: "move", direction: space};
}
var valley = new LifelikeWorld(
  ["############################",
   "#####                 ######",
   "##   ***                **##",
   "#   *##**         **  O  *##",
   "#    ***     O    ##**    *#",
   "#       O         ##***    #",
   "#                 ##**     #",
   "#   O       #*             #",
   "#*          #**       O    #",
   "#***        ##**    O    **#",
   "##****     ###***       *###",
   "############################"],
  {"#": Wall,
   "O": SmartPlanterEater,
   "*": Plant}


   
)*/

/*function SmartPlantEater() {
  this.energy = 30;
  this.direction = "e";
}
SmartPlantEater.prototype.act = function(view) {
  var space = view.find(" ");
  if (this.energy > 90 && space)
    return {type: "reproduce", direction: space};
  var plants = view.findAll("*");
  if (plants.length > 1)
    return {type: "eat", direction: randomElement(plants)};
  if (view.look(this.direction) != " " && space)
    this.direction = space;
  return {type: "move", direction: this.direction};
};

var animateWorld=new LifelikeWorld(
  ["############################",
   "#####                 ######",
   "##   ***                **##",
   "#   *##**         **  O  *##",
   "#    ***     O    ##**    *#",
   "#       O         ##***    #",
   "#                 ##**     #",
   "#   O       #*             #",
   "#*          #**       O    #",
   "#***        ##**    O    **#",
   "##****     ###***       *###",
   "############################"],
  {"#": Wall,
   "O": SmartPlantEater,
   "*": Plant}
);


function SmartplanteaterEater(){
  this.energy=20
}
SmartplanteaterEater.prototype.act = function(view) {
  var space = view.find(" ");
  if (this.energy > 1000&& space)
    return {type: "reproduce", direction: space};
  var planteater = view.find("O");
  if (planteater)
    return {type: "eat", direction: planteater};
  if (space)
    return {type: "move", direction: space};}

    var lieshashike=new LifelikeWorld(
      ["#################################################",
       "#####        Q     ***##      O  *****     ######",
       "##  O***                **##     *****  ** #  ###",
       "#   *##**         **  O  *#####     O  *      ###",
       "#    ***     O    ##**    *##    ********      ##",
       "#       O         ##***        O    **  *    #  #",
       "#   ****          ##**     ###    ********      #",
       "#   O       #*           ********       ***    ##",
       "#*        Q #**       O         O     O         #",
       "#***        ##**    O    **###      ********   ##",
       "##****    ###***       *####        O     O  ####",
       "#################################################"],
      {"#": Wall,
       "O": SmartPlantEater,
       "*": Plant,
       "Q": SmartplanteaterEater}
    );*/
    

    function SmartPlantEater() {
      this.energy = 30;
      this.direction = "e";
    }
    SmartPlantEater.prototype.act = function(view) {
      var space = view.find(" ");
      if (this.energy > 90 && space)
        return {type: "reproduce", direction: space};
      var plants = view.findAll("*");
      if (plants.length > 1)
        return {type: "eat", direction: randomElement(plants)};
      if (view.look(this.direction) != " " && space)
        this.direction = space;
      return {type: "move", direction: this.direction};
    };
    
    function Tiger() {
      this.energy = 100;
      this.direction = "w";
      // Used to track the amount of prey seen per turn in the last six turns
      this.preySeen = [];
    }
    Tiger.prototype.act = function(view) {
      // Average number of prey seen per turn
      var seenPerTurn = this.preySeen.reduce(function(a, b) {
        return a + b;
      }, 0) / this.preySeen.length;
      var prey = view.findAll("O");
      this.preySeen.push(prey.length);
      // Drop the first element from the array when it is longer than 6
      if (this.preySeen.length > 6)
        this.preySeen.shift();
    
      // Only eat if the predator saw more than ¼ prey animal per turn
      if (prey.length && seenPerTurn > 0.25)
        return {type: "eat", direction: randomElement(prey)};
        
      var space = view.find(" ");
      if (this.energy > 400 && space)
        return {type: "reproduce", direction: space};
      if (view.look(this.direction) != " " && space)
        this.direction = space;
      return {type: "move", direction: this.direction};
    };
    
    var animateWorld=new LifelikeWorld(
      ["####################################################",
       "#                 ####         ****              ###",
       "#   *  @  ##                 ########       OO    ##",
       "#   *    ##        O O                 ****       *#",
       "#       ##*                        ##########     *#",
       "#      ##***  *         ****                     **#",
       "#* **  #  *  ***      #########                  **#",
       "#* **  #      *               #   *              **#",
       "#     ##              #   O   #  ***          ######",
       "#*            @       #       #   *        O  #    #",
       "#*                    #  ######                 ** #",
       "###          ****          ***                  ** #",
       "#       O                        @         O       #",
       "#   *     ##  ##  ##  ##               ###      *  #",
       "#   **         #              *       #####  O     #",
       "##  **  O   O  #  #    ***  ***        ###      ** #",
       "###               #   *****                    ****#",
       "####################################################"],
      {"#": Wall,
       "@": Tiger,
       "O": SmartPlantEater, // from previous exercise
       "*": Plant}
    );
for(var i=0;i<10000;i++){
  animateWorld.turn();
  console.log( animateWorld.toString())}