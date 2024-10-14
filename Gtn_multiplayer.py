import random
turn, super_turn, draw, count = 0, 0, 0, 0
turns, player_names, draw_index, tied_names = [], [], [], []

players = int(input("How many players are there: "))
print("")
player_dict = {}

while (count < players):
    
    names = input(f"Name of player{count + 1}: ")

    if names == "":
        print("You must enter a name")
    else:
        player_names.append(names)
        count += 1

while super_turn < players:
    random_number = random.randint(1, 101)
    while 1:
        try:
            num = int(input(f"The computer selected a number between 1 to 100. {player_names[super_turn]} guess the number: "))
            turn += 1
            if num < random_number:
                print(f"Try something bigger")
            elif num > random_number:
                print(f"Try something smaller")
            else:
                print(f"You took {turn} turns to guess it. great job!!\n============================================\n")
                turns.append(turn)
                turn = 0
                super_turn += 1
                for i in range(super_turn):
                    player_dict[turns[i]] = player_names[i]
                break
        except ValueError:
            print("You must enter a number")

for i in range(len(turns)):
    if turns[i] == min(turns):
        draw += 1
        draw_index.append(i)

if draw > 1:
    for i in range(len(draw_index)):
        tied_names.append(player_names[draw_index[i]])
    print(f"The match is tied between {tied_names}")
else:
    print(f"The WINNER is {player_dict[min(turns)]}")

