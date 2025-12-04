// src/data/dailyQuotes.js
// TitanTrack Daily Wisdom - 360 Curated Quotes
// Themes: Self-Mastery, Discipline, Stoicism, Warrior Philosophy, Transmutation

const dailyQuotes = [
  // ============================================================
  // STOIC PHILOSOPHY (1-60)
  // ============================================================
  
  // Marcus Aurelius
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "The soul becomes dyed with the color of its thoughts.", author: "Marcus Aurelius" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "He who lives in harmony with himself lives in harmony with the universe.", author: "Marcus Aurelius" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius" },
  { text: "The best revenge is not to be like your enemy.", author: "Marcus Aurelius" },
  { text: "Accept the things to which fate binds you, and love the people with whom fate brings you together.", author: "Marcus Aurelius" },
  { text: "When you arise in the morning, think of what a precious privilege it is to be alive.", author: "Marcus Aurelius" },
  { text: "It is not death that a man should fear, but he should fear never beginning to live.", author: "Marcus Aurelius" },
  { text: "The object of life is not to be on the side of the majority, but to escape finding oneself in the ranks of the insane.", author: "Marcus Aurelius" },
  { text: "Never esteem anything as of advantage to you that will make you break your word or lose your self-respect.", author: "Marcus Aurelius" },
  { text: "How much time he gains who does not look to see what his neighbor says or does or thinks.", author: "Marcus Aurelius" },
  { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius" },
  { text: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.", author: "Marcus Aurelius" },
  { text: "Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.", author: "Marcus Aurelius" },
  
  // Seneca
  { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "He who is brave is free.", author: "Seneca" },
  { text: "No man is free who is not master of himself.", author: "Seneca" },
  { text: "True happiness is to enjoy the present, without anxious dependence upon the future.", author: "Seneca" },
  { text: "A gem cannot be polished without friction, nor a man perfected without trials.", author: "Seneca" },
  { text: "The whole future lies in uncertainty: live immediately.", author: "Seneca" },
  { text: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca" },
  { text: "Sometimes even to live is an act of courage.", author: "Seneca" },
  { text: "Associate with people who are likely to improve you.", author: "Seneca" },
  { text: "If a man knows not to which port he sails, no wind is favorable.", author: "Seneca" },
  { text: "Religion is regarded by the common people as true, by the wise as false, and by rulers as useful.", author: "Seneca" },
  { text: "As is a tale, so is life: not how long it is, but how good it is, is what matters.", author: "Seneca" },
  
  // Epictetus
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
  { text: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus" },
  { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus" },
  { text: "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.", author: "Epictetus" },
  { text: "Only the educated are free.", author: "Epictetus" },
  { text: "Don't explain your philosophy. Embody it.", author: "Epictetus" },
  { text: "Any person capable of angering you becomes your master.", author: "Epictetus" },
  { text: "Circumstances don't make the man, they only reveal him to himself.", author: "Epictetus" },
  { text: "If you want to improve, be content to be thought foolish and stupid.", author: "Epictetus" },
  { text: "Freedom is the only worthy goal in life. It is won by disregarding things that lie beyond our control.", author: "Epictetus" },
  { text: "People are not disturbed by things, but by the views they take of them.", author: "Epictetus" },
  { text: "Caretake this moment. Immerse yourself in its particulars.", author: "Epictetus" },
  { text: "Know first who you are and then adorn yourself accordingly.", author: "Epictetus" },
  
  // Other Stoics
  { text: "The key is to keep company only with people who uplift you.", author: "Epictetus" },
  { text: "Nothing, to my way of thinking, is a better proof of a well ordered mind than a man's ability to stop just where he is and pass some time in his own company.", author: "Seneca" },
  { text: "We are more often frightened than hurt; and we suffer more from imagination than from reality.", author: "Seneca" },
  { text: "Hang on to your youthful enthusiasms — you'll be able to use them better when you're older.", author: "Seneca" },
  { text: "Life is very short and anxious for those who forget the past, neglect the present, and fear the future.", author: "Seneca" },
  { text: "The greatest obstacle to living is expectancy, which hangs upon tomorrow and loses today.", author: "Seneca" },
  { text: "Throw me to the wolves and I will return leading the pack.", author: "Seneca" },
  { text: "You act like mortals in all that you fear, and like immortals in all that you desire.", author: "Seneca" },
  { text: "What need is there to weep over parts of life? The whole of it calls for tears.", author: "Seneca" },
  { text: "Brave men rejoice in adversity, just as brave soldiers triumph in war.", author: "Seneca" },
  { text: "Every new beginning comes from some other beginning's end.", author: "Seneca" },
  { text: "Expecting is the greatest impediment to living.", author: "Seneca" },
  { text: "Most powerful is he who has himself in his own power.", author: "Seneca" },
  { text: "The mind that is anxious about future events is miserable.", author: "Seneca" },
  
  // ============================================================
  // WARRIOR PHILOSOPHY & BUSHIDO (61-120)
  // ============================================================
  
  // Miyamoto Musashi
  { text: "There is nothing outside of yourself that can ever enable you to get better, stronger, richer, quicker, or smarter. Everything is within.", author: "Miyamoto Musashi" },
  { text: "You must understand that there is more than one path to the top of the mountain.", author: "Miyamoto Musashi" },
  { text: "Do nothing that is of no use.", author: "Miyamoto Musashi" },
  { text: "The ultimate aim of martial arts is not having to use them.", author: "Miyamoto Musashi" },
  { text: "Think lightly of yourself and deeply of the world.", author: "Miyamoto Musashi" },
  { text: "Today is victory over yourself of yesterday; tomorrow is your victory over lesser men.", author: "Miyamoto Musashi" },
  { text: "Get beyond love and grief: exist for the good of Man.", author: "Miyamoto Musashi" },
  { text: "In strategy it is important to see distant things as if they were close and to take a distanced view of close things.", author: "Miyamoto Musashi" },
  { text: "Perception is strong and sight weak. In strategy it is important to see distant things as if they were close.", author: "Miyamoto Musashi" },
  { text: "You can only fight the way you practice.", author: "Miyamoto Musashi" },
  { text: "Step by step walk the thousand-mile road.", author: "Miyamoto Musashi" },
  { text: "It is difficult to understand the universe if you only study one planet.", author: "Miyamoto Musashi" },
  { text: "The true science of martial arts means practicing them in such a way that they will be useful at any time.", author: "Miyamoto Musashi" },
  { text: "Respect Buddha and the gods without counting on their help.", author: "Miyamoto Musashi" },
  { text: "If you wish to control others you must first control yourself.", author: "Miyamoto Musashi" },
  
  // Sun Tzu
  { text: "Victorious warriors win first and then go to war, while defeated warriors go to war first and then seek to win.", author: "Sun Tzu" },
  { text: "The supreme art of war is to subdue the enemy without fighting.", author: "Sun Tzu" },
  { text: "In the midst of chaos, there is also opportunity.", author: "Sun Tzu" },
  { text: "Appear weak when you are strong, and strong when you are weak.", author: "Sun Tzu" },
  { text: "Know yourself and you will win all battles.", author: "Sun Tzu" },
  { text: "The greatest victory is that which requires no battle.", author: "Sun Tzu" },
  { text: "Treat your men as you would your own beloved sons. And they will follow you into the deepest valley.", author: "Sun Tzu" },
  { text: "Opportunities multiply as they are seized.", author: "Sun Tzu" },
  { text: "Move swift as the Wind and closely-formed as the Wood. Attack like the Fire and be still as the Mountain.", author: "Sun Tzu" },
  { text: "Even the finest sword plunged into salt water will eventually rust.", author: "Sun Tzu" },
  { text: "One mark of a great soldier is that he fights on his own terms or fights not at all.", author: "Sun Tzu" },
  { text: "Let your plans be dark and impenetrable as night, and when you move, fall like a thunderbolt.", author: "Sun Tzu" },
  { text: "When the enemy is relaxed, make them toil. When full, starve them. When settled, make them move.", author: "Sun Tzu" },
  { text: "He will win who knows when to fight and when not to fight.", author: "Sun Tzu" },
  { text: "Build your opponent a golden bridge to retreat across.", author: "Sun Tzu" },
  
  // Samurai Wisdom
  { text: "A warrior is worthless unless he rises above others and stands strong in the midst of a storm.", author: "Yamamoto Tsunetomo" },
  { text: "There is surely nothing other than the single purpose of the present moment.", author: "Yamamoto Tsunetomo" },
  { text: "It is a good viewpoint to see the world as a dream. When you have something like a nightmare, you will wake up and tell yourself that it was only a dream.", author: "Yamamoto Tsunetomo" },
  { text: "Matters of great concern should be treated lightly. Matters of small concern should be treated seriously.", author: "Yamamoto Tsunetomo" },
  { text: "It is spiritless to think that you cannot attain to that which you have seen and heard the masters attain.", author: "Yamamoto Tsunetomo" },
  { text: "One should make his decisions within the space of seven breaths.", author: "Yamamoto Tsunetomo" },
  { text: "In the eyes of mercy, no one should have hateful thoughts. Feel pity for the man who is even more at fault.", author: "Yamamoto Tsunetomo" },
  { text: "A real man does not think of victory or defeat. He plunges recklessly towards an irrational death.", author: "Yamamoto Tsunetomo" },
  { text: "The Way of the Samurai is found in death.", author: "Yamamoto Tsunetomo" },
  { text: "Even if it seems certain that you will lose, retaliate. Neither wisdom nor technique has a place in this.", author: "Yamamoto Tsunetomo" },
  
  // Spartan & Greek Warriors
  { text: "Come back with your shield, or on it.", author: "Spartan Mothers" },
  { text: "He who sweats more in training bleeds less in war.", author: "Spartan Proverb" },
  { text: "A Spartan's true strength is the warrior next to him.", author: "Spartan Wisdom" },
  { text: "The walls of Sparta were its young men, and its borders the points of their spears.", author: "Agesilaus II" },
  { text: "It is not the size of the dog in the fight, but the size of the fight in the dog.", author: "Spartan Proverb" },
  { text: "We do not rise to the level of our expectations. We fall to the level of our training.", author: "Archilochus" },
  { text: "Out of every one hundred men, ten shouldn't even be there. Eighty are just targets.", author: "Heraclitus" },
  { text: "The nation that makes a great distinction between its scholars and its warriors will have its thinking done by cowards and its fighting done by fools.", author: "Thucydides" },
  { text: "Self-control is the chief element in self-respect, and self-respect is the chief element in courage.", author: "Thucydides" },
  { text: "A collision at sea can ruin your entire day.", author: "Thucydides" },
  
  // Viking Wisdom
  { text: "Fear not death for the hour of your doom is set and none may escape it.", author: "Viking Proverb" },
  { text: "Where you recognize evil, speak out against it, and give no truces to your enemies.", author: "Hávamál" },
  { text: "Better to fight and fall than to live without hope.", author: "Viking Proverb" },
  { text: "Cattle die, kindred die, every man is mortal. But the good name never dies of one who has done well.", author: "Hávamál" },
  { text: "The coward believes he will live forever if he holds back in the battle.", author: "Viking Proverb" },
  { text: "A man should be loyal through life and repay gift with gift.", author: "Hávamál" },
  { text: "The unwise man is awake all night, thinking of many things.", author: "Hávamál" },
  { text: "Gold is little comfort for the kinsman dead.", author: "Viking Proverb" },
  { text: "He falls not whom true friends help forward on his way.", author: "Hávamál" },
  { text: "A man should trust his own wisdom when he walks among strangers.", author: "Hávamál" },
  
  // ============================================================
  // SELF-MASTERY & DISCIPLINE (121-180)
  // ============================================================
  
  // Buddha
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "It is better to conquer yourself than to win a thousand battles.", author: "Buddha" },
  { text: "No one saves us but ourselves. No one can and no one may. We ourselves must walk the path.", author: "Buddha" },
  { text: "Peace comes from within. Do not seek it without.", author: "Buddha" },
  { text: "You will not be punished for your anger, you will be punished by your anger.", author: "Buddha" },
  { text: "Three things cannot be long hidden: the sun, the moon, and the truth.", author: "Buddha" },
  { text: "In the end, only three things matter: how much you loved, how gently you lived, and how gracefully you let go.", author: "Buddha" },
  { text: "To conquer oneself is a greater task than conquering others.", author: "Buddha" },
  { text: "An idea that is developed and put into action is more important than an idea that exists only as an idea.", author: "Buddha" },
  { text: "Your work is to discover your work and then with all your heart to give yourself to it.", author: "Buddha" },
  { text: "There is no path to happiness: happiness is the path.", author: "Buddha" },
  { text: "Every morning we are born again. What we do today is what matters most.", author: "Buddha" },
  { text: "Hatred does not cease by hatred, but only by love.", author: "Buddha" },
  { text: "The root of suffering is attachment.", author: "Buddha" },
  { text: "Drop by drop is the water pot filled.", author: "Buddha" },
  
  // Lao Tzu
  { text: "Knowing others is intelligence; knowing yourself is true wisdom. Mastering others is strength; mastering yourself is true power.", author: "Lao Tzu" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "When I let go of what I am, I become what I might be.", author: "Lao Tzu" },
  { text: "He who controls others may be powerful, but he who has mastered himself is mightier still.", author: "Lao Tzu" },
  { text: "Nature does not hurry, yet everything is accomplished.", author: "Lao Tzu" },
  { text: "Be content with what you have; rejoice in the way things are. When you realize there is nothing lacking, the whole world belongs to you.", author: "Lao Tzu" },
  { text: "The flame that burns twice as bright burns half as long.", author: "Lao Tzu" },
  { text: "If you are depressed you are living in the past. If you are anxious you are living in the future.", author: "Lao Tzu" },
  { text: "Silence is a source of great strength.", author: "Lao Tzu" },
  { text: "The truth is not always beautiful, nor beautiful words the truth.", author: "Lao Tzu" },
  { text: "Care about what other people think and you will always be their prisoner.", author: "Lao Tzu" },
  { text: "Act without expectation.", author: "Lao Tzu" },
  { text: "To lead people, walk behind them.", author: "Lao Tzu" },
  { text: "Stop thinking, and end your problems.", author: "Lao Tzu" },
  { text: "New beginnings are often disguised as painful endings.", author: "Lao Tzu" },
  
  // Confucius
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Confucius" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "Real knowledge is to know the extent of one's ignorance.", author: "Confucius" },
  { text: "The will to win, the desire to succeed, the urge to reach your full potential: these are the keys that will unlock the door to personal excellence.", author: "Confucius" },
  { text: "By three methods we may learn wisdom: First, by reflection, which is noblest; Second, by imitation, which is easiest; and third by experience, which is the bitterest.", author: "Confucius" },
  { text: "When it is obvious that the goals cannot be reached, don't adjust the goals, adjust the action steps.", author: "Confucius" },
  { text: "He who conquers himself is the mightiest warrior.", author: "Confucius" },
  { text: "Choose a job you love, and you will never have to work a day in your life.", author: "Confucius" },
  { text: "To see what is right and not do it is the want of courage.", author: "Confucius" },
  
  // Rumi
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", author: "Rumi" },
  { text: "The wound is the place where the Light enters you.", author: "Rumi" },
  { text: "You were born with wings, why prefer to crawl through life?", author: "Rumi" },
  { text: "Don't be satisfied with stories, how things have gone with others. Unfold your own myth.", author: "Rumi" },
  { text: "What you seek is seeking you.", author: "Rumi" },
  { text: "Raise your words, not your voice. It is rain that grows flowers, not thunder.", author: "Rumi" },
  { text: "The lion is most handsome when looking for food.", author: "Rumi" },
  { text: "Silence is the language of God, all else is poor translation.", author: "Rumi" },
  { text: "Be like the sun for grace and mercy. Be like the night to cover others' faults.", author: "Rumi" },
  { text: "Set your life on fire. Seek those who fan your flames.", author: "Rumi" },
  { text: "Let the beauty of what you love be what you do.", author: "Rumi" },
  { text: "The art of knowing is knowing what to ignore.", author: "Rumi" },
  { text: "When the world pushes you to your knees, you're in the perfect position to pray.", author: "Rumi" },
  { text: "Why do you stay in prison when the door is so wide open?", author: "Rumi" },
  { text: "Be grateful for whoever comes, because each has been sent as a guide from beyond.", author: "Rumi" },
  
  // ============================================================
  // MODERN DISCIPLINE & MENTAL TOUGHNESS (181-240)
  // ============================================================
  
  // David Goggins
  { text: "You are in danger of living a life so comfortable and soft that you will die without ever realizing your potential.", author: "David Goggins" },
  { text: "The only way that you're ever going to get to the other side of this journey is by suffering. You have to suffer in order to grow.", author: "David Goggins" },
  { text: "We live in a world where mediocrity is often rewarded. Do not fall into the trap.", author: "David Goggins" },
  { text: "It's a lot more than mind over matter. It takes relentless self-discipline to schedule suffering into your day, every day.", author: "David Goggins" },
  { text: "Mental toughness is a lifestyle.", author: "David Goggins" },
  { text: "In a society where mediocrity is often the standard, few are willing to put in the work to become uncommon.", author: "David Goggins" },
  { text: "Motivation is crap. Motivation comes and goes. When you're driven, whatever is in front of you will get destroyed.", author: "David Goggins" },
  { text: "The most important conversations you'll ever have are the ones you'll have with yourself.", author: "David Goggins" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "David Goggins" },
  { text: "Suffering is the true test of life.", author: "David Goggins" },
  { text: "You have to build calluses on your brain just like how you build calluses on your hands.", author: "David Goggins" },
  { text: "When you think that you're done, you're only at 40% of your body's capability.", author: "David Goggins" },
  { text: "Be uncommon amongst uncommon people.", author: "David Goggins" },
  { text: "Nobody cares what you did yesterday. What have you done today to better yourself?", author: "David Goggins" },
  { text: "The only person who was going to turn my life around was me.", author: "David Goggins" },
  
  // Jocko Willink
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  { text: "Don't expect to be motivated every day. You have to learn to be disciplined.", author: "Jocko Willink" },
  { text: "The more you practice, the better you get, the more freedom you have to create.", author: "Jocko Willink" },
  { text: "Stop researching every aspect of it and reading all about it and asking people about it. Just go do it.", author: "Jocko Willink" },
  { text: "A leader must be humble but not passive; quiet, but not silent.", author: "Jocko Willink" },
  { text: "The test is not a complex one: when the strategy is wrong, it must be changed.", author: "Jocko Willink" },
  { text: "There are no shortcuts. There is only discipline.", author: "Jocko Willink" },
  { text: "Default aggressive.", author: "Jocko Willink" },
  { text: "Hesitation is the enemy. Just attack.", author: "Jocko Willink" },
  { text: "Get after it.", author: "Jocko Willink" },
  { text: "Prioritize and execute.", author: "Jocko Willink" },
  { text: "If you want to be tougher, be tougher.", author: "Jocko Willink" },
  { text: "Go down swinging. And I'll tell you: if you fight with all you have, more often than not you won't go down at all.", author: "Jocko Willink" },
  { text: "Don't count on motivation. Count on discipline.", author: "Jocko Willink" },
  { text: "It's not what you preach, it's what you tolerate.", author: "Jocko Willink" },
  
  // Other Modern Minds
  { text: "Hard times create strong men. Strong men create good times. Good times create weak men. Weak men create hard times.", author: "G. Michael Hopf" },
  { text: "A man who has a why to live for can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "That which does not kill us makes us stronger.", author: "Friedrich Nietzsche" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },
  { text: "The individual has always had to struggle to keep from being overwhelmed by the tribe.", author: "Friedrich Nietzsche" },
  { text: "There is always some madness in love. But there is also always some reason in madness.", author: "Friedrich Nietzsche" },
  { text: "No one can construct for you the bridge upon which precisely you must cross the stream of life.", author: "Friedrich Nietzsche" },
  { text: "In heaven, all the interesting people are missing.", author: "Friedrich Nietzsche" },
  { text: "I'm not upset that you lied to me, I'm upset that from now on I can't believe you.", author: "Friedrich Nietzsche" },
  { text: "Become who you are.", author: "Friedrich Nietzsche" },
  { text: "The surest way to corrupt a youth is to instruct him to hold in higher esteem those who think alike than those who think differently.", author: "Friedrich Nietzsche" },
  { text: "When you look into an abyss, the abyss also looks into you.", author: "Friedrich Nietzsche" },
  { text: "There are no facts, only interpretations.", author: "Friedrich Nietzsche" },
  { text: "One must still have chaos in oneself to be able to give birth to a dancing star.", author: "Friedrich Nietzsche" },
  
  // Jordan Peterson
  { text: "Compare yourself to who you were yesterday, not to who someone else is today.", author: "Jordan Peterson" },
  { text: "Set your house in perfect order before you criticize the world.", author: "Jordan Peterson" },
  { text: "You can only find out what you actually believe rather than what you think you believe by watching how you act.", author: "Jordan Peterson" },
  { text: "If you fulfill your obligations everyday you don't need to worry about the future.", author: "Jordan Peterson" },
  { text: "The purpose of life is finding the largest burden that you can bear and bearing it.", author: "Jordan Peterson" },
  { text: "You're going to pay a price for every bloody thing you do and everything you don't do.", author: "Jordan Peterson" },
  { text: "To stand up straight with your shoulders back is to accept the terrible responsibility of life.", author: "Jordan Peterson" },
  { text: "You should take care of yourself and help and be good to the people around you.", author: "Jordan Peterson" },
  { text: "Pursue what is meaningful, not what is expedient.", author: "Jordan Peterson" },
  { text: "If you can't understand why someone is doing something, look at the consequences of their actions.", author: "Jordan Peterson" },
  
  // ============================================================
  // ENERGY & TRANSMUTATION (241-300)
  // ============================================================
  
  // Napoleon Hill
  { text: "Sex energy is the creative energy of all geniuses. There never has been, and never will be a great leader, builder, or artist lacking in this driving force of sex.", author: "Napoleon Hill" },
  { text: "Every adversity, every failure, every heartache carries with it the seed of an equal or greater benefit.", author: "Napoleon Hill" },
  { text: "Strength and growth come only through continuous effort and struggle.", author: "Napoleon Hill" },
  { text: "Whatever the mind can conceive and believe, it can achieve.", author: "Napoleon Hill" },
  { text: "A goal is a dream with a deadline.", author: "Napoleon Hill" },
  { text: "Don't wait. The time will never be just right.", author: "Napoleon Hill" },
  { text: "When defeat comes, accept it as a signal that your plans are not sound. Rebuild those plans and set sail once more toward your coveted goal.", author: "Napoleon Hill" },
  { text: "The starting point of all achievement is desire.", author: "Napoleon Hill" },
  { text: "Patience, persistence and perspiration make an unbeatable combination for success.", author: "Napoleon Hill" },
  { text: "You are the master of your destiny. You can influence, direct and control your own environment.", author: "Napoleon Hill" },
  { text: "Great achievement is usually born of great sacrifice, and is never the result of selfishness.", author: "Napoleon Hill" },
  { text: "Set your mind on a definite goal and observe how quickly the world stands aside to let you pass.", author: "Napoleon Hill" },
  { text: "Action is the real measure of intelligence.", author: "Napoleon Hill" },
  { text: "The way of success is the way of continuous pursuit of knowledge.", author: "Napoleon Hill" },
  { text: "If you cannot do great things, do small things in a great way.", author: "Napoleon Hill" },
  
  // Nikola Tesla
  { text: "I do not think there is any thrill that can go through the human heart like that felt by the inventor as he sees some creation of the brain unfolding to success.", author: "Nikola Tesla" },
  { text: "The present is theirs; the future, for which I really worked, is mine.", author: "Nikola Tesla" },
  { text: "If you want to find the secrets of the universe, think in terms of energy, frequency and vibration.", author: "Nikola Tesla" },
  { text: "Our virtues and our failings are inseparable, like force and matter.", author: "Nikola Tesla" },
  { text: "Be alone, that is the secret of invention; be alone, that is when ideas are born.", author: "Nikola Tesla" },
  { text: "I don't care that they stole my idea. I care that they don't have any of their own.", author: "Nikola Tesla" },
  { text: "The day science begins to study non-physical phenomena, it will make more progress in one decade than in all the previous centuries.", author: "Nikola Tesla" },
  { text: "Of all things, I liked books best.", author: "Nikola Tesla" },
  { text: "Instinct is something which transcends knowledge.", author: "Nikola Tesla" },
  { text: "The scientific man does not aim at an immediate result.", author: "Nikola Tesla" },
  
  // Historical Figures on Discipline
  { text: "I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.", author: "Bruce Lee" },
  { text: "Absorb what is useful, discard what is useless and add what is specifically your own.", author: "Bruce Lee" },
  { text: "Do not pray for an easy life, pray for the strength to endure a difficult one.", author: "Bruce Lee" },
  { text: "Defeat is a state of mind; no one is ever defeated until defeat has been accepted as a reality.", author: "Bruce Lee" },
  { text: "A wise man can learn more from a foolish question than a fool can learn from a wise answer.", author: "Bruce Lee" },
  { text: "Knowing is not enough, we must apply. Willing is not enough, we must do.", author: "Bruce Lee" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Be like water making its way through cracks. Be formless, shapeless, like water.", author: "Bruce Lee" },
  { text: "Mistakes are always forgivable, if one has the courage to admit them.", author: "Bruce Lee" },
  { text: "A goal is not always meant to be reached, it often serves simply as something to aim at.", author: "Bruce Lee" },
  { text: "Empty your mind, be formless. Shapeless, like water.", author: "Bruce Lee" },
  { text: "As you think, so shall you become.", author: "Bruce Lee" },
  { text: "The key to immortality is first living a life worth remembering.", author: "Bruce Lee" },
  { text: "If you spend too much time thinking about a thing, you'll never get it done.", author: "Bruce Lee" },
  { text: "I'm not in this world to live up to your expectations and you're not in this world to live up to mine.", author: "Bruce Lee" },
  
  // More Transmutation Wisdom
  { text: "The energy of the mind is the essence of life.", author: "Aristotle" },
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "Educating the mind without educating the heart is no education at all.", author: "Aristotle" },
  { text: "Pleasure in the job puts perfection in the work.", author: "Aristotle" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
  { text: "The whole is greater than the sum of its parts.", author: "Aristotle" },
  { text: "Happiness depends upon ourselves.", author: "Aristotle" },
  
  // ============================================================
  // PURPOSE & VISION (301-360)
  // ============================================================
  
  // Theodore Roosevelt
  { text: "It is not the critic who counts; not the man who points out how the strong man stumbles.", author: "Theodore Roosevelt" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only man who never makes mistakes is the man who never does anything.", author: "Theodore Roosevelt" },
  { text: "In any moment of decision, the best thing you can do is the right thing.", author: "Theodore Roosevelt" },
  { text: "Keep your eyes on the stars, and your feet on the ground.", author: "Theodore Roosevelt" },
  { text: "Nothing in the world is worth having or worth doing unless it means effort, pain, difficulty.", author: "Theodore Roosevelt" },
  { text: "Courage is not having the strength to go on; it is going on when you don't have the strength.", author: "Theodore Roosevelt" },
  { text: "The credit belongs to the man who is actually in the arena.", author: "Theodore Roosevelt" },
  { text: "With self-discipline most anything is possible.", author: "Theodore Roosevelt" },
  
  // Abraham Lincoln
  { text: "Whatever you are, be a good one.", author: "Abraham Lincoln" },
  { text: "I am a slow walker, but I never walk back.", author: "Abraham Lincoln" },
  { text: "The best way to predict your future is to create it.", author: "Abraham Lincoln" },
  { text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln" },
  { text: "My great concern is not whether you have failed, but whether you are content with your failure.", author: "Abraham Lincoln" },
  { text: "Give me six hours to chop down a tree and I will spend the first four sharpening the axe.", author: "Abraham Lincoln" },
  { text: "I will prepare and some day my chance will come.", author: "Abraham Lincoln" },
  { text: "Nearly all men can stand adversity, but if you want to test a man's character, give him power.", author: "Abraham Lincoln" },
  { text: "Those who deny freedom to others deserve it not for themselves.", author: "Abraham Lincoln" },
  { text: "Character is like a tree and reputation like a shadow. The shadow is what we think of it; the tree is the real thing.", author: "Abraham Lincoln" },
  
  // Winston Churchill
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "If you're going through hell, keep going.", author: "Winston Churchill" },
  { text: "The pessimist sees difficulty in every opportunity. The optimist sees opportunity in every difficulty.", author: "Winston Churchill" },
  { text: "Continuous effort, not strength or intelligence, is the key to unlocking our potential.", author: "Winston Churchill" },
  { text: "You have enemies? Good. That means you've stood up for something in your life.", author: "Winston Churchill" },
  { text: "Never give in. Never give in. Never, never, never, never.", author: "Winston Churchill" },
  { text: "We make a living by what we get, but we make a life by what we give.", author: "Winston Churchill" },
  { text: "Attitude is a little thing that makes a big difference.", author: "Winston Churchill" },
  { text: "The price of greatness is responsibility.", author: "Winston Churchill" },
  { text: "Kites rise highest against the wind, not with it.", author: "Winston Churchill" },
  
  // More Wisdom
  { text: "The only thing we have to fear is fear itself.", author: "Franklin D. Roosevelt" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Stay hungry. Stay foolish.", author: "Steve Jobs" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "The people who are crazy enough to think they can change the world are the ones who do.", author: "Steve Jobs" },
  { text: "Have the courage to follow your heart and intuition.", author: "Steve Jobs" },
  { text: "Design is not just what it looks like and feels like. Design is how it works.", author: "Steve Jobs" },
  { text: "Quality is more important than quantity. One home run is much better than two doubles.", author: "Steve Jobs" },
  { text: "I'm convinced that about half of what separates successful entrepreneurs from the non-successful ones is pure perseverance.", author: "Steve Jobs" },
  
  // Final Wisdom
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "How long are you going to wait before you demand the best for yourself?", author: "Epictetus" },
  { text: "Men acquire a particular quality by constantly acting in a particular way.", author: "Aristotle" },
  { text: "First they ignore you, then they laugh at you, then they fight you, then you win.", author: "Mahatma Gandhi" },
  { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
  { text: "The weak can never forgive. Forgiveness is the attribute of the strong.", author: "Mahatma Gandhi" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "An ounce of practice is worth more than tons of preaching.", author: "Mahatma Gandhi" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Glory is fleeting, but obscurity is forever.", author: "Napoleon Bonaparte" },
  { text: "Impossible is a word to be found only in the dictionary of fools.", author: "Napoleon Bonaparte" },
  { text: "He who fears being conquered is sure of defeat.", author: "Napoleon Bonaparte" },
  { text: "Take time to deliberate; but when the time for action arrives, stop thinking and go in.", author: "Napoleon Bonaparte" },
  { text: "Courage isn't having the strength to go on — it is going on when you don't have strength.", author: "Napoleon Bonaparte" },
  { text: "Death is nothing, but to live defeated and inglorious is to die daily.", author: "Napoleon Bonaparte" },
  { text: "Victory belongs to the most persevering.", author: "Napoleon Bonaparte" },
  { text: "The world makes way for the man who knows where he is going.", author: "Ralph Waldo Emerson" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
  { text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "It is better to be a warrior in a garden than a gardener in a war.", author: "Chinese Proverb" },
  { text: "The man who has no imagination has no wings.", author: "Muhammad Ali" },
  { text: "He who is not courageous enough to take risks will accomplish nothing in life.", author: "Muhammad Ali" },
  { text: "Service to others is the rent you pay for your room here on earth.", author: "Muhammad Ali" },
  { text: "Float like a butterfly, sting like a bee.", author: "Muhammad Ali" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Champions aren't made in gyms. Champions are made from something deep inside them.", author: "Muhammad Ali" },
  { text: "The fight is won or lost far away from witnesses—behind the lines, in the gym, and out there on the road.", author: "Muhammad Ali" },
  { text: "I hated every minute of training, but I said, 'Don't quit. Suffer now and live the rest of your life as a champion.'", author: "Muhammad Ali" },
  { text: "Only a man who knows what it is like to be defeated can reach down to the bottom of his soul and come back.", author: "Muhammad Ali" },
  { text: "He who is not everyday conquering some fear has not learned the secret of life.", author: "Ralph Waldo Emerson" },
  { text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson" },
  { text: "For every minute you are angry you lose sixty seconds of happiness.", author: "Ralph Waldo Emerson" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
  { text: "Sow a thought, reap an action; sow an action, reap a habit; sow a habit, reap a character; sow a character, reap a destiny.", author: "Stephen Covey" },
  { text: "Most people do not listen with the intent to understand; they listen with the intent to reply.", author: "Stephen Covey" },
  { text: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey" },
  { text: "The greatest weapon against stress is our ability to choose one thought over another.", author: "William James" }
];

/**
 * Get today's quote based on day of year
 * Everyone sees the same quote on the same day
 * 
 * @returns {Object} { text: string, author: string }
 */
export const getTodayQuote = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  return dailyQuotes[dayOfYear % dailyQuotes.length];
};

/**
 * Get quote for a specific date
 * 
 * @param {Date} date - The date to get quote for
 * @returns {Object} { text: string, author: string }
 */
export const getQuoteForDate = (date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  return dailyQuotes[dayOfYear % dailyQuotes.length];
};

/**
 * Get total number of quotes
 * 
 * @returns {number}
 */
export const getQuoteCount = () => dailyQuotes.length;

export default dailyQuotes;