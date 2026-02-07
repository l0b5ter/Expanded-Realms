# Expanded-Realms
Unofficial DLC with toggleable features

<img width="513" height="744" alt="image" src="https://github.com/user-attachments/assets/47deb0bd-b1d5-4903-9511-592cd6e2945d" /><img width="472" height="747" alt="image" src="https://github.com/user-attachments/assets/803c759d-3c97-4473-83c3-06b82b7f5cdd" />

##NOTE this is a DLC not a mod! Meaning it works in multiplayer games :D
To improve smoothnes and prevent desync for multiplayer games, v0.0.2 added the "handshake" mechaninc. This to make sure player has the dlc and that everyone has the right toggles enabled. When the game start each player with the dlc will write their current dlc version to the game, on 1st turn the game will check version then sync toggles to the game host (player 0), meaning after this each player will have the same toggle state as game host.
<img width="396" height="178" alt="Screenshot 2026-02-01 004502" src="https://github.com/user-attachments/assets/f1137993-c32f-4c54-8220-9a78463f7a6b" />

On singleplayer games this "handshake" will simply not run, cause only 1 player in game.



### Features:
- __Unit Rename__                            
    Rename units by right-clicking the unit name.  
- __Fog Regrows__                   
    Fog gradually returns to unrevealed tiles after 12 inactive turns.
- __Natural Disasters__                   
    Adds 7 world events based on natural disasters.
      Blizzard: Tiles turn to Tundra/Snow while pillaging improvements
      Drought: Tiles turn to plains/desert
      River silting: Tiles next to river becomes "flooded", marsh on tiles, plains turn to grassland while pillaging tiles
      Flood: Tiles turn to plains/grassland while pillaging tiles
      Eruption: Pillages tiles around the natural wonder (Karakota and Fuji)
      Wildfire: Jungle/Forest fires in a radius around target tile
      Plague: Random city gets effected and lose 1 pop.
- __Climate Changes__                   
    Climate change alters the map as you play, accelerating with each factory, nuclear plant and airport built. Altitude based, meaning top and bottom of map will feel the cold, while middle will get the heat.
- __City takes pillage damage__                  
    City takes 5 damage per pillaged tiles (3 tiles radius).    
- __Fallout damage__                
    Units ending their turn on fallout tiles takes 25 damage.    
- __Nuclear Plant Can Meltdown__ (currently disabled)  
- __Helicopters on coast__              
    Allows helicopters to hover on coastal tiles.    
- __More CS Quests__                              
    Adds 3 new rare CityState quests based on relations. Each 10 turns theres a 6% chance that a Citystate will pick one of these.   
    "Silent Witness":    
      Quest: Dont decalre war, do not denounce anyone, do not enter this CityState territory and dont pledge to protect for 15turns.   
      Reward: +45 influence with CS, +20 culture (scales by era), 10 fixed bottom influence.   
    "Line Drawn":     
      Quest: Denounce target Civ.   
      Reward: +40 influence with CS, +20 culture (scales by era).       
    "Selective Passage":        
      Quest: Do open borders with target Civ.   
      Reward: +35 influence with CS, +20 culture (scales by era).    
- __CS Conquest Penalty__                               
    Makes Ai punish CityState absorption.   
- __War Workers: Roads & Forts__                               
    Incorporates the worker unit into the AI's war and defense behaviour. While attacking a city the worker will stack with a war unit and make a road towards the enemy city. If enemy       unit appears next to this stack, will make the worker back off. When the city attack takes more than 10turns, the worker will start making forts outside of the city range. When          defending against an attack, the worker will make forts on unimproved tiles. When the war ends the worker will replace the fort with improvements.




  ### Features (WIP):
- __Civ Starting Bonus__  
