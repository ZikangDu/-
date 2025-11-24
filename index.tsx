import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Modality } from "@google/genai";

// --- Types ---

type ScreenState = 
  | 'home' 
  // Lists
  | 'answer-helper-list'   // Select Topic
  | 'answer-helper-practice' // New Paginated Practice View
  // Tools
  | 'speaking-intro' 
  | 'writing-input'
  | 'writing-results'
  | 'error';

type ChatMessage = {
    role: 'user' | 'ai';
    text: string;
    isTyping?: boolean;
};

// Key = topicId_slideIndex, Value = Messages
type ChatHistory = Record<string, ChatMessage[]>;

// --- Data Models ---

const FULL_QUESTION_BANK = {
    part1: [
        // --- Permanent Topics (Updated) ---
        {
            id: 'p1_perm1', title: "1. Work or studies (工作或学习)", questions: [
                // Studies
                "1. What subjects are you studying?",
                "2. Do you like your subject?",
                "3. Why did you choose to study that subject?",
                "4. Do you think that your subject is popular in your country?",
                "5. Do you have any plans for your studies in the next five years?",
                "6. What are the benefits of being your age?",
                "7. Do you want to change your major?",
                "8. Do you prefer to study in the mornings or in the afternoons?",
                "9. How much time do you spend on your studies each week?",
                "10. Are you looking forward to working?",
                "11. What technology do you use when you study?",
                "12. What changes would you like to see in your school?",
                // Work
                "13. What work do you do?",
                "14. Why did you choose to do that type of work (or that job)?",
                "15. Do you like your job?",
                "16. What requirements did you need to meet to get your current job?",
                "17. Do you have any plans for your work in the next five years?",
                "18. What do you think is the most important at the moment?",
                "19. Do you want to change to another job?",
                "20. Do you miss being a student?",
                "21. What technology do you use at work?",
                "22. Who helps you the most? And how?"
            ]
        },
        {
            id: 'p1_perm2', title: "2. Home/Accommodation (居住)", questions: [
                "1. What kind of house or apartment do you want to live in in the future?",
                "2. Are the transport facilities to your home very good?",
                "3. Do you prefer living in a house or an apartment?",
                "4. Please describe the room you live in.",
                "5. What part of your home do you like the most?",
                "6. How long have you lived there?",
                "7. Do you plan to live there for a long time?",
                "8. What’s the difference between where you are living now and where you have lived in the past?",
                "9. Can you describe the place where you live?",
                "10. What room does your family spend most of the time in?",
                "11. What's your favorite room in your apartment or house?",
                "12. What makes you feel pleasant in your home?",
                "13. Do you think it is important to live in a comfortable environment?",
                "14. Do you live in an apartment or a house?",
                "15. Who do you live with?",
                "16. What do you usually do in your apartment?",
                "17. What kinds of accommodation do you live in?"
            ]
        },
        {
            id: 'p1_perm3', title: "3. Hometown (家乡)", questions: [
                "1. Where is your hometown?",
                "2. Is that a big city or a small place?",
                "3. Please describe your hometown a little.",
                "4. How long have you been living there?",
                "5. Do you think you will continue living there for a long time?",
                "6. Do you like your hometown?",
                "7. Do you like living there?",
                "8. What do you like (most) about your hometown?",
                "9. Is there anything you dislike about it?",
                "10. What's your hometown famous for?",
                "11. Did you learn about the history of your hometown at school?",
                "12. Are there many young people in your hometown?",
                "13. Is your hometown a good place for young people to pursue their careers?",
                "14. Have you learned anything about the history of your hometown?",
                "15. Did you learn about the culture of your hometown in your childhood?"
            ]
        },
        {
            id: 'p1_perm4', title: "4. The area you live in (居住区域)", questions: [
                "1. Do you like the area that you live in?",
                "2. Where do you like to go in that area?",
                "3. Do you know any famous people in your area?",
                "4. What are some changes in the area recently?",
                "5. Do you know any of your neighbors?",
                "6. Are the people in your neighborhood nice and friendly?",
                "7. Do you live in a noisy or a quiet area?"
            ]
        },
        {
            id: 'p1_perm5', title: "5. The city you live in (居住城市)", questions: [
                "1. What city do you live in?",
                "2. Do you like this city? Why?",
                "3. How long have you lived in this city?",
                "4. Are there big changes in this city?",
                "5. Is this city your permanent residence?",
                "6. Are there people of different ages living in this city?",
                "7. Are the people friendly in the city?",
                "8. Is the city friendly to children and old people?",
                "9. Do you often see your neighbors?",
                "10. What's the weather like where you live?",
                "11. Would you recommend your city to others?"
            ]
        },
        // --- New Topics (Sep-Dec 2025) ---
        {
            id: 'p1_new1', title: "6. Plants (植物)", isNew: true, questions: [
                "1. Do you keep plants at home?",
                "2. What plant did you grow when you were young?",
                "3. Do you know anything about growing a plant?",
                "4. Do Chinese people send plants as gifts?"
            ]
        },
        {
            id: 'p1_new2', title: "7. Public places (公共场所)", isNew: true, questions: [
                "1. Have you ever talked with someone you don't know in public places?",
                "2. Do you wear headphones in public places?",
                "3. Would you like to see more public places near where you live?",
                "4. Do you often go to public places with your friends?"
            ]
        },
        {
            id: 'p1_new3', title: "8. Rules (规则)", isNew: true, questions: [
                "1. Are there any rules for students at your school?",
                "2. Do you think students would benefit more from more rules?",
                "3. Have you ever had a really dedicated teacher?",
                "4. Do you prefer to have more or fewer rules at school?",
                "5. Have you ever had a really strict teacher?",
                "6. Would you like to work as a teacher in a rule-free school?"
            ]
        },
        {
            id: 'p1_new4', title: "9. Shoes (鞋子)", isNew: true, questions: [
                "1. Do you like buying shoes? How often?",
                "2. Have you ever bought shoes online?",
                "3. How much money do you usually spend on shoes?",
                "4. Which do you prefer, fashionable shoes or comfortable shoes?"
            ]
        },
        {
            id: 'p1_new5', title: "10. Doing something well (做得好)", isNew: true, questions: [
                "1. Do you have an experience when you did something well?",
                "2. Do you have an experience when your teacher thought you did a good job?",
                "3. Do you often tell your friends when they do something well?"
            ]
        },
        {
            id: 'p1_new6', title: "11. Crowded place (拥挤的地方)", isNew: true, questions: [
                "1. Is the city where you live crowded?",
                "2. Is there a crowded place near where you live?",
                "3. Do you like crowded places?",
                "4. Do most people like crowded places?",
                "5. When was the last time you were in a crowded place?"
            ]
        },
        {
            id: 'p1_new7', title: "12. Going out (外出)", isNew: true, questions: [
                "1. Do you bring food or snacks with you when going out?",
                "2. Do you always take your mobile phone with you when going out?",
                "3. Do you often bring cash with you?",
                "4. How often do you use cash?"
            ]
        },
        {
            id: 'p1_new8', title: "13. Staying with old people (与老人相处)", isNew: true, questions: [
                "1. Have you ever worked with old people?",
                "2. Are you happy to work with people who are older than you?",
                "3. What are the benefits of being friends with or working with old people?",
                "4. Do you enjoy spending time with old people?"
            ]
        },
        {
            id: 'p1_new9', title: "14. Growing vegetables/fruits (种植蔬果)", isNew: true, questions: [
                "1. Are you interested in growing vegetables and fruits?",
                "2. Is growing vegetables popular in your country?",
                "3. Do many people grow vegetables in your city?",
                "4. Do you think it’s easy to grow vegetables?",
                "5. Should schools teach students how to grow vegetables?"
            ]
        },
        {
            id: 'p1_new10', title: "15. Chatting (聊天)", isNew: true, questions: [
                "1. Do you like chatting with friends?",
                "2. What do you usually chat about with friends?",
                "3. Do you prefer to chat with a group of people or with only one friend?",
                "4. Do you prefer to communicate face-to-face or via social media?",
                "5. Do you argue with friends?"
            ]
        },
        {
            id: 'p1_new11', title: "16. Borrowing and lending (借出借入)", isNew: true, questions: [
                "1. Have you borrowed books from others?",
                "2. Have you ever borrowed money from others?",
                "3. Do you like to lend things to others?",
                "4. How do you feel when people don't return things they borrowed from you?",
                "5. Do you mind if others borrow money from you?"
            ]
        },
        {
            id: 'p1_new12', title: "17. Advertisement (广告)", isNew: true, questions: [
                "1. Is there an advertisement that made an impression on you when you were a child?",
                "2. Do you see a lot of advertising on trains or other transport?",
                "3. Do you like advertisements?",
                "4. What kind of advertising do you like?",
                "5. Do you often see advertisements when you are on your phone or computer?"
            ]
        },
        {
            id: 'p1_new13', title: "18. Museum (博物馆)", isNew: true, questions: [
                "1. Do you think museums are important?",
                "2. Are there many museums in your hometown?",
                "3. Do you often visit a museum?",
                "4. When was the last time you visited a museum?"
            ]
        },
        {
            id: 'p1_new14', title: "19. Having a break (休息)", isNew: true, questions: [
                "1. How often do you take a rest or a break?",
                "2. What do you usually do when you are resting?",
                "3. Do you take a nap when you are taking your rest?",
                "4. How do you feel after taking a nap?"
            ]
        },
        {
            id: 'p1_new15', title: "20. Sharing (分享)", isNew: true, questions: [
                "1. Did your parents teach you to share when you were a child?",
                "2. What kind of things do you like to share with others?",
                "3. What kind of things are not suitable for sharing?",
                "4. Do you have anything to share with others recently?",
                "5. Who is the first person you would like to share good news with?",
                "6. Do you prefer to share news with your friends or your parents?"
            ]
        },
        {
            id: 'p1_new_nm1', title: "21. Friends (朋友 - 非大陆)", isNew: true, questions: [
                "1. Do you have a friend you have known for a long time?",
                "2. What do you usually do with your friends?",
                "3. Where do you often meet each other?",
                "4. Do you often go out with your friends?",
                "5. How important are friends to you?",
                "6. Do you prefer to spend time with one friend or with a group of friends?",
                "7. Would you invite friends to your home?",
                "8. Is there a difference between where you meet friends now and where you used to meet them in the past?",
                "9. Why are some places suitable for meeting while others are not?"
            ]
        },
        // --- Old Topics (Retained) ---
        { id: 'p1_old1', title: "22. Text messages", questions: ["1. How often do you send text messages?", "2. Is sending messages popular in your country?", "3. Did you send more messages when you were younger?", "4. Do you reply to messages as soon as you receive them?"] },
        { id: 'p1_old2', title: "23. Flowers", questions: ["1. Do you love flowers?", "2. Do you know anyone who loves flowers?", "3. Are there a lot of flowers where you live?", "4. Do you take photos of flowers in your daily life?", "5. Do people in your country often send flowers to others?"] },
        { id: 'p1_old3', title: "24. Birthday", questions: ["1. What do you usually do on your birthday?", "2. What did you do on your birthday when you were young?", "3. Do you think it is important for you to celebrate your birthday?", "4. Whose birthday do you think is the most important to celebrate in China?"] },
        { id: 'p1_old4', title: "25. Geography", questions: ["1. How do you like geography?", "2. Do you think geography is useful?", "3. Have you ever learned geography?", "4. Do you want to be a geography teacher?", "5. Will you learn more about the geography of other countries?"] },
        { id: 'p1_old5', title: "26. Names", questions: ["1. Does your name have any special meaning?", "2. How would you choose names for your next generation?", "3. Does anyone in your family have the same name as you?", "4. Are there any names that are more popular than others in China?"] },
        { id: 'p1_old6', title: "27. Staying up", questions: ["1. Do you often stay up late?", "2. Did you stay up late when you were a kid?", "3. What do you do when you stay up late?", "4. What does it feel like the next morning if you stay up late?"] },
        { id: 'p1_old7', title: "28. Public transportation", questions: ["1. What kind of public transportation do you usually take?", "2. When do you usually take public transportation, in your everyday life or when you are travelling?", "3. Do most people prefer public transportation in your country?", "4. Did you take public transportation when you were a kid?", "5. Will there be more people taking public transportation in the future?"] },
        { id: 'p1_old8', title: "29. Saying 'thank you'", questions: ["1. Have you ever sent a thank you card to others?", "2. Do people in your country often say ‘thank you’?", "3. On what occasions do you say ‘thank you’?", "4. Why do people need to say ‘thank you’?"] },
        { id: 'p1_old9', title: "30. Puzzles", questions: ["1. Did you do puzzles in your childhood?", "2. When do you do puzzles, during your trip or when you feel bored?", "3. Do you like doing word puzzles or number puzzles? Which is more difficult for you?", "4. Do you think it is good for old people to do puzzles?"] },
        { id: 'p1_old10', title: "31. Being busy", questions: ["1. Are you often busy?", "2. Why are you busy?", "3. When are you busy?", "4. Are you busier now than when you were a child?"] },
        { id: 'p1_old11', title: "32. Memory", questions: ["1. Are you good at memorising things?", "2. Have you ever forgotten something important?", "3. What do you need to remember in your daily life?", "4. How do you remember important things?"] },
        { id: 'p1_old12', title: "33. Machine", questions: ["1. What is your favourite machine in your home?", "2. Do you think washing machines and sweeping machines are important?", "3. Do you read the instructions before using a machine?", "4. Do you think it is important to read the instructions?"] },
        { id: 'p1_old13', title: "34. Patience", questions: ["1. Are you a patient person?", "2. What is it that makes you feel impatient?", "3. How do you feel when you have to do something for a long time?", "4. Does your job require you to be patient?", "5. Are you more patient now than when you were a child?"] },
        { id: 'p1_old14', title: "35. Snacks", questions: ["1. When do you usually eat snacks now?", "2. Do you think it is healthy for you to eat snacks?", "3. Did you often eat snacks when you were young?", "4. What snacks do you like to eat?"] },
        { id: 'p1_old15', title: "36. Weather", questions: ["1. What's the weather like where you live?", "2. Do you prefer cold or hot weather?", "3. Do you prefer dry or wet weather?", "4. Are you in the habit of checking the weather forecast? When and how often?", "5. What do you think are the effects of climate change in recent years?", "6. Would you like to visit other cities that have different climates from where you live?"] },
        { id: 'p1_old16', title: "37. Writing", questions: ["1. Do you write a lot?", "2. What do you like to write? Why?", "3. Do you think the things you write would change?", "4. Do you prefer typing or handwriting when you are writing?", "5. How often do you keep diaries?", "6. What other methods do you use to record your life?"] },
        { id: 'p1_old17', title: "38. Spending time by yourself", questions: ["1. Do you usually spend time by yourself?", "2. What did you do last time you were by yourself?", "3. How do you usually spend your time by yourself?", "4. Do you like spending time by yourself?"] },
        { id: 'p1_old18', title: "39. Spare time", questions: ["1. Do you often have free time?", "2. What do you usually do in your spare time?", "3. Which day do you have more free time on, Saturday or Sunday?", "4. Would you like to have more free time in the future?"] },
        { id: 'p1_old19', title: "40. Housework and cooking", questions: ["1. Did you do some house cleaning when you were young?", "2. What housework do you like or dislike doing?", "3. Do you like cooking?", "4. How often do you cook?", "5. Do you enjoy cooking with others?", "6. Do you like to cook for a large group of people?", "7. What do you think of working as a waiter?"] },
        { id: 'p1_old20', title: "41. List", questions: ["1. Do you make a list when you shop?", "2. Do you make a list for your work? Does it work?", "3. Why don't some people like making lists?", "4. Do you prefer to make a list on paper or your phone?"] },
        { id: 'p1_old21', title: "42. Singing", questions: ["1. Do you like singing? Why?", "2. Have you ever learnt how to sing?", "3. Who do you want to sing for?", "4. Do you think singing can bring happiness to people?"] },
        { id: 'p1_old22', title: "43. Praise/encouragement", questions: ["1. Have you had any achievements recently?", "2. How do you feel when you are praised?", "3. When was the last time you praised someone?", "4. Do you think parents should often praise and encourage their children?", "5. Have you ever been praised or encouraged by your teacher?"] },
        { id: 'p1_old23', title: "44. Internet", questions: ["1. When did you start using the internet?", "2. How often do you go online?", "3. How does the internet influence people?", "4. Do you think you spend too much time online?", "5. What would you do without the internet?"] },
        { id: 'p1_old24', title: "45. Chocolate", questions: ["1. Do you like eating chocolate? Why or why not?", "2. How often do you eat chocolate?", "3. Did you often eat chocolate when you were a child?", "4. Why do you think chocolate is popular around the world?", "5. What's your favourite flavour of chocolate?", "6. Do you think it is good to use chocolate as gifts to others?"] },
        { id: 'p1_old25', title: "46. Plan/schedule", questions: ["1. Do you like making plans?", "2. Do you use paper or your cellphone to make plans?", "3. What are the benefits of making plans?", "4. Why is it that some people don't make plans?"] },
        { id: 'p1_old26', title: "47. Taking photos", questions: ["1. Do you like to print out your photos or just keep them on your phone or camera?", "2. Do you like taking photos?", "3. Do you like taking selfies?", "4. What is your favourite family photo?", "5. Do you want to improve your photography skills?"] },
        { id: 'p1_old27', title: "48. Staying at home", questions: ["1. Are you a person who likes to stay at home?", "2. What do you do when you stay at home?", "3. What is your favourite place at home?", "4. What did you often do at home as a child?", "5. Would you like to stay at home a lot in the future?", "6. What do you like to do in your free time when you're at home?"] },
        { id: 'p1_old28', title: "49. Electronic devices/Technology", questions: ["1. What kind of apps have you downloaded on your phone?", "2. What technology do you often use, computers or cellphones?", "3. What electronic devices have you bought lately?", "4. Is there any technology you want to buy?", "5. Is technology important in your life?", "6. Is there any technology you don't like?", "7. What do you think are the trends in technology today compared to when you were young?"] },
        { id: 'p1_old29', title: "50. Mobile phone", questions: ["1. Have you ever lost your mobile phone?", "2. What was your first mobile phone?", "3. Do you often use your mobile phone for texting or calls?", "4. Will you buy a new one in the future?", "5. How has your mobile phone changed your life?"] },
        { id: 'p1_old30', title: "51. Happy things", questions: ["1. Is there anything that has made you feel happy lately?", "2. What made you happy when you were little?", "3. What do you think will make you feel happy in the future?", "4. When do you feel happy at work? Why?", "5. Do you feel happy when buying new things?", "6. Do you think people are happy when buying new things?"] },
    ],
    part23: {
        events: [
            // --- New Events ---
            {
                id: 'e_new1', title: "1. 迷路 (新题) Getting Lost", isNew: true,
                part2: "Describe an occasion when you lost your way.",
                part2_bullets: ["Where you were", "What happened", "How you felt", "And explain how you found your way."],
                part3: [
                    "1. Why do some people get lost more easily than others?", 
                    "2. Do you think it is important to be able to read a map?", 
                    "3. Do you think it is important to do some preparation before you travel to new places?",
                    "4. How can people find their way when they are lost?",
                    "5. Is a paper map still necessary?",
                    "6. How do people react when they get lost?"
                ]
            },
            {
                id: 'e_new2', title: "2. 和亲友享受的晚餐 (新题) Dinner", isNew: true,
                part2: "Describe a great dinner you and your friend or family members enjoyed.",
                part2_bullets: ["What you had", "Who you had the dinner with", "What you talked about during the dinner", "And explain why you enjoyed it."],
                part3: [
                    "1. Do people prefer to eat out at restaurants or eat at home during the Spring Festival?",
                    "2. What food do you eat on special occasions, like during the Spring Festival or the Mid-autumn Festival?",
                    "3. Why do people like to have meals together during important festivals?",
                    "4. Is it a hassle to prepare a meal at home?",
                    "5. What do people often talk about during meals?",
                    "6. People are spending less and less time having meals with their families these days. Is this good or bad?"
                ]
            },
            {
                id: 'e_new3', title: "3. 想再去一次的远行 (新题) Long Journey", isNew: true,
                part2: "Describe a long journey you had and would like to take again.",
                part2_bullets: ["When/where you went", "Who you had the journey with", "Why you had the journey", "And explain why you would like to have it again."],
                part3: [
                    "1. Do you think it is a good choice to travel by plane?",
                    "2. What are the differences between group travelling and travelling alone?",
                    "3. What do we need to prepare for a long journey?",
                    "4. Why do some people like making long journeys?",
                    "5. Why do some people prefer to travel in their own country?",
                    "6. Why do some people prefer to travel abroad?"
                ]
            },
            {
                id: 'e_new4', title: "4. 突然停电 (新题) Electricity Off", isNew: true,
                part2: "Describe a time when the electricity suddenly went off.",
                part2_bullets: ["When/where it happened", "How long it lasted", "What you did during that time", "And explain how you felt about it."],
                part3: [
                    "1. Which is better, electric bicycles or ordinary bicycles?",
                    "2. Do you think electric bicycles will replace ordinary bicycles in the future?",
                    "3. Which is better, electric cars or petrol cars?",
                    "4. How did people manage to live without electricity in the ancient world?",
                    "5. Is it difficult for the government to replace all the petrol cars with electric cars?",
                    "6. Do people use more electricity now than before?"
                ]
            },
            {
                id: 'e_new5', title: "5. 别人向你道歉 (新题) Apology", isNew: true,
                part2: "Describe a time when someone apologized to you.",
                part2_bullets: ["When it was", "Who this person is", "Why he or she apologized to you", "And how you felt about it."],
                part3: [
                    "1. Do you think people should apologize for anything wrong they do?",
                    "2. Do people in your country like to say 'sorry'?",
                    "3. On what occasion do people usually apologize to others?",
                    "4. Why do some people refuse to say 'sorry' to others?",
                    "5. Do you think every 'sorry' is from the bottom of the heart?",
                    "6. Are women better than men at recognizing emotions?"
                ]
            },
            {
                id: 'e_new6', title: "6. 第一次尝试的兴奋活动 (新题) New Activity", isNew: true,
                part2: "Describe an exciting activity you have tried for the first time.",
                part2_bullets: ["What it is", "When/where you did it", "Why you thought it was exciting", "And explain how you felt about it."],
                part3: [
                    "1. Why are some people unwilling to try new things?",
                    "2. Do you think fear stops people from trying new things?",
                    "3. Why are some people keen on doing dangerous activities?",
                    "4. Do you think that children adapt to new things more easily than adults?",
                    "5. What can people learn from doing dangerous activities?",
                    "6. What are the benefits of trying new things?"
                ]
            },
            {
                id: 'e_new7', title: "7. 第一次用外语 (新题) Foreign Language", isNew: true,
                part2: "Describe the time when you first talked in a foreign language.",
                part2_bullets: ["Where you were", "Who you were with", "What you talked about", "And explain how you felt about it."],
                part3: [
                    "1. At what age should children start learning a foreign language?",
                    "2. Which skill is more important, speaking or writing?",
                    "3. Does a person still need to learn other languages, if he or she is good at English?",
                    "4. Do you think minority languages will disappear?",
                    "5. Does learning a foreign language help in finding a job?",
                    "6. Which stage of life do you think is the best for learning a foreign language?"
                ]
            },
            {
                id: 'e_new8', title: "8. 弄坏东西 (新题) Broke Something", isNew: true,
                part2: "Describe a time when you broke something.",
                part2_bullets: ["What it was", "When/where that happened", "How you broke it", "And explain what you did after that."],
                part3: [
                    "1. What kind of things are more likely to be broken by people at home?",
                    "2. What kind of people like to fix things by themselves?",
                    "3. Do you think clothes produced in the factory are of better quality than those made by hand?",
                    "4. Do you think handmade clothes are more valuable?",
                    "5. Is the older generation better at fixing things?",
                    "6. Do you think elderly people should teach young people how to fix things?"
                ]
            },
            {
                id: 'e_new9', title: "9. 别人帮忙下做的决定 (新题) Decision", isNew: true,
                part2: "Describe an important decision made with the help of other people.",
                part2_bullets: ["What the decision was", "Why you made the decision", "Who helped you make the decision", "And how you felt about it."],
                part3: [
                    "1. What kind of decisions do you think are meaningful?",
                    "2. What important decisions should be made by teenagers themselves?",
                    "3. Why are some people unwilling to make quick decisions?",
                    "4. Do people like to ask for advice more for their personal life or their work?",
                    "5. Why do some people like to ask others for advice?"
                ]
            },
            {
                id: 'e_new10', title: "10. 等待特别事情 (新题) Waiting", isNew: true,
                part2: "Describe a time when you waited for something special that would happen.",
                part2_bullets: ["What you waited for", "Where you waited", "Why it was special", "And explain how you felt while you were waiting."],
                part3: [
                    "1. On what occasions do people usually need to wait?",
                    "2. Who behave better when waiting, children or adults?",
                    "3. Compared to the past, are people less patient now? Why?",
                    "4. What are the positive and negative effects of waiting on society?",
                    "5. Why are some people unwilling to wait?",
                    "6. Where do children learn to be patient, at home or at school?"
                ]
            },
            {
                id: 'e_new11', title: "11. 购物服务 (新题) Good Service", isNew: true,
                part2: "Describe a time when you received good service in a shop/store.",
                part2_bullets: ["Where the shop is", "When you went to the shop", "What service you received from the staff", "And explain how you felt about the service."],
                part3: [
                    "1. Why are shopping malls so popular in China?",
                    "2. What are the advantages and disadvantages of shopping in small shops?",
                    "3. Why do some people not like shopping in small shops?",
                    "4. What are the differences between online shopping and in-store shopping?",
                    "5. What are the advantages and disadvantages of shopping online?",
                    "6. Can consumption drive economic growth?"
                ]
            },
            {
                id: 'e_new12', title: "12. 失约 (新题) Missed Appointment", isNew: true,
                part2: "Describe a time when you forgot/missed an appointment.",
                part2_bullets: ["What the appointment was for", "Who you made it with", "Why you forgot/missed it", "And explain how you felt about the experience."],
                part3: [
                    "1. Is punctuality important to people?",
                    "2. What do you think is a good way to record things? Why?",
                    "3. Which is more important, a work-related appointment or an appointment with a friend? Why?",
                    "4. If someone doesn't really like whom they are going to meet, they may deliberately miss their appointment. Is that true? Why?",
                    "5. Do you think people should remember family history?",
                    "6. How do people who are busy remember things they need to do?"
                ]
            },
            {
                id: 'e_new13', title: "13. 克服困难终成功 (新题) Success", isNew: true,
                part2: "Describe a difficult thing you did and succeeded.",
                part2_bullets: ["What it was", "How you overcame the difficulties", "Whether you got help", "And explain how you felt after you succeeded."],
                part3: [
                    "1. Should people set goals for themselves?",
                    "2. How would you define success?",
                    "3. How can we judge whether young people are successful nowadays?",
                    "4. Are successful people often lonely?",
                    "5. What kinds of success can students achieve at school?",
                    "6. Should students be proud of their success?"
                ]
            },
            {
                id: 'e_new14', title: "14. 糟糕购物 (新题) Bad Shopping", isNew: true,
                part2: "Describe a problem you had while shopping online or in a store.",
                part2_bullets: ["When it happened", "What you bought", "What problem you had", "And explain how you felt about the experience."],
                part3: [
                    "1. What kind of customer service do you think is good?",
                    "2. What are the differences between shopping online and in-store?",
                    "3. What problems do customers often have while shopping?",
                    "4. What do you think customers should do when there are problems with products bought online?",
                    "5. Can customer complaints help improve product quality?",
                    "6. What do you think of people complaining when they buy poor quality goods at a low price?"
                ]
            },
            {
                id: 'e_new15', title: "15. 想作为观众看的赛事 (新题) Sports Event", isNew: true,
                part2: "Describe a sports event that you would like to attend as part of the audience.",
                part2_bullets: ["What it is", "Who you want to watch with", "Why you want to be part of the audience", "And explain how you feel about it."],
                part3: [
                    "1. What kinds of sports events are broadcast on TV or other media in your country?",
                    "2. Do people in your country enjoy watching football games?",
                    "3. Do encouragement and applause from the audience have an impact on athletes? How do these affect them?",
                    "4. Which do people in your country prefer to watch, team sports or individual sports?",
                    "5. What kinds of sports are the most popular in your country?",
                    "6. Why do so many children like to watch basketball games?"
                ]
            },
            {
                id: 'e_new16', title: "16. 信息搜索 (新题) Search Info", isNew: true,
                part2: "Describe a time when you needed to search for information.",
                part2_bullets: ["What information you needed to search for", "When you searched for it", "Where you searched for it", "And explain why you needed to search for it."],
                part3: [
                    "1. How can people search for information now?",
                    "2. What information can people get from television?",
                    "3. Do you think libraries are still important in the digital age?",
                    "4. Does the development of the Internet have any impact on some disadvantaged people?",
                    "5. How do people identify reliable information on the Internet?",
                    "6. Is it good if people could have more access to information in the future?"
                ]
            },
            {
                id: 'e_new_nm1', title: "1. 近期日常改变 (非大陆) Routine Change", isNew: true,
                part2: "Describe a positive change that you have made recently in your daily routine.",
                part2_bullets: ["What the change is", "How you have changed the routine", "Why you think it is a positive change", "And explain how you feel about the change."],
                part3: [
                    "1. What do people normally plan in their daily lives?",
                    "2. Is time management very important in our daily lives?",
                    "3. What changes would people often make?",
                    "4. Do you think it is good to change jobs frequently?",
                    "5. Who do you think would make changes more often, young people or old people?",
                    "6. Who should get more promotion opportunities in the workplace, young people or older people?"
                ]
            },
            {
                id: 'e_new_nm2', title: "3. 不寻常的一餐 (非大陆) Unusual Meal", isNew: true,
                part2: "Describe an unusual meal you had.",
                part2_bullets: ["When you had it", "Where you had it", "Whom you had it with", "And explain why it was unusual."],
                part3: [
                    "1. What are the advantages and disadvantages of eating in restaurants?",
                    "2. What fast food restaurants are there in your country?",
                    "3. Do people eat fast food at home?",
                    "4. Why do some people choose to eat out instead of ordering takeout?",
                    "5. Do people in your country socialize in restaurants? Why?",
                    "6. Do people in your country value food culture?"
                ]
            },
            // --- Old Events ---
            { id: 'e_old1', title: "17. 收钱作礼物 Money as Gift", part2: "Describe a time when you received money as a gift.", part2_bullets: ["When it happened", "Who gave you money", "Why he/she gave you money", "And explain how you used the money."], part3: ["1. Why do people rarely use cash now?", "2. When do children begin to comprehend the value of money?", "3. Should parents reward children with money?", "4. Is it good and necessary to teach children to save money?", "5. What are the advantages and disadvantages of using credit cards?", "6. Do you think it's a good thing that more people are using digital payment?"] },
            { id: 'e_old2', title: "18. 校外学到的重要事情 Learned thing", part2: "Describe an important thing you learned (not at school or college).", part2_bullets: ["What it was", "When you learned it", "How you learned it", "And explain why you was important."], part3: ["1. What can children learn from parents?", "2. Do you think some children are well-behaved because they are influenced by their parents?", "3. Is it necessary for adults to learn new things?", "4. How can people learn new things?", "5. Does the internet make learning easier or more difficult?", "6. Can people acquire more knowledge now than before?"] },
            { id: 'e_old3', title: "19. 和他人一起计划活动 Plan Activity", part2: "Describe a time when you and some other people made a plan to do an activity.", part2_bullets: ["What it was", "When/where you made it", "What the activity was", "And explain how you felt about the plan."], part3: ["1. What kind of plans do young people often make?", "2. Why can't people always follow their plans?", "3. Why do people make plans?", "4. Is it important to make plans?", "5. Why do some people like to make plans while others just don't like to?", "6. Are there any people who never make plans?"] },
            { id: 'e_old4', title: "20. 有趣且印象深的谈话 Conversation", part2: "Describe an impressive and interesting conversation you had.", part2_bullets: ["Who you talked to", "When/where you had it", "What you talked about", "And explain why you think it was impressive."], part3: ["1. What topics do young people like to talk about?", "2. Is it important to have good communication skills at work?", "3. What are the differences between talking with friends online and face-to-face?", "4. What are the differences between online and onsite meetings in a company?"] },
            { id: 'e_old5', title: "21. 印象深刻的英语课 English Lesson", part2: "Describe an impressive English lesson you had and enjoyed.", part2_bullets: ["What it was about", "When you had it", "What the teacher did", "And why you enjoyed the lesson."], part3: ["1. Why do people learn foreign languages?", "2. What makes a good foreign language teacher?", "3. Do you think grammar is important when learning foreign languages?", "4. Is it interesting to be a foreign language teacher? Why?", "5. What is the impact of information technology on learning foreign languages?", "6. What effect will it have on the students if the teacher is impatient with them?"] },
            { id: 'e_old6', title: "22. 分享 Sharing", part2: "Describe a time when you had to share something with others.", part2_bullets: ["What it was", "When it happened", "Who you shared it with", "And explain how you felt about it."], part3: ["1. Do you think kids like to share? Why?", "2. How can parents teach their children to share?", "3. What do you think is the benefit of sharing for children?", "4. Is there any technology that parents should persuade children to share with others?", "5. How can governments encourage shared transport?", "6. Why is it important to share food with others during a celebration?"] },
            { id: 'e_old7', title: "23. 努力实现的目标 Goal", part2: "Describe a goal you set that you tried your best to achieve.", part2_bullets: ["What it was", "When you set it", "What you did to achieve it", "And how you felt about it."], part3: ["1. Do people in your country set goals?", "2. Do people usually set long-term goals or short-term ones?", "3. Why is setting goals important in the workplace?", "4. What is the difference between goals set by old people and young people?", "5. How do people set goals?", "6. Do you think people should have personal life goals?"] },
            { id: 'e_old8', title: "24. 决意等待 Decision to Wait", part2: "Describe a time you made a decision to wait for something.", part2_bullets: ["When it happened", "What you waited for", "Why you made the decision", "And explain how you felt while waiting."], part3: ["1. What do people in your country often do while waiting?", "2. Why do some people like a slow-paced life?", "3. Is being patient good for people? Why?", "4. Are people less patient now than people in the past? Why?", "5. Why do children lack patience?", "6. How can people become more patient?"] },
            { id: 'e_old9', title: "25. 朋友的争执 Argument", part2: "Describe an argument two of your friends had.", part2_bullets: ["When it happened", "What it was about", "How it was solved", "And how you felt about it."], part3: ["1. Do you think arguments are important?", "2. What do family members usually have arguments about?", "3. Is it easier for you to have arguments with your family or with your friends?", "4. Do you think people should change the way they think when having arguments?", "5. When two people have an argument, do you think they should find a third party to ask for advice?", "6. What qualities make a good lawyer?"] },
            { id: 'e_old10', title: "26. 想尝试的户外运动 Outdoor Sport", part2: "Describe an outdoor sport you would like to try for the first time.", part2_bullets: ["What it is", "When/where you would like to do it", "With whom you would like to do it", "And explain why you would like to do it."], part3: ["1. What are the differences between indoor sports and outdoor sports?", "2. What outdoor sports are popular in China?", "3. What sports are popular among elderly people?", "4. Which outdoor sports are popular with children?", "5. How does weather affect outdoor sports?", "6. Which is more dangerous, team sports or individual sports?"] },
            { id: 'e_old11', title: "27. 争论 Disagreement", part2: "Describe a disagreement you had with someone.", part2_bullets: ["Who you had it with", "What it was about", "What happened", "And explain how you felt about it."], part3: ["1. What do you do if you disagree with someone?", "2. How can we stop an argument from escalating into a fight?", "3. Who do you think should teach children to respect their teacher?", "4. What disagreements do parents and children usually have?", "5. Why do some people avoid arguing with others?", "6. How do we show respect to others when we disagree with them?"] },
        ],
        things: [
            // --- New Things ---
            {
                id: 't_new1', title: "1. 想多了解的野生动物 (新题) Wild Animal", isNew: true,
                part2: "Describe a wild animal that you want to learn more about.",
                part2_bullets: ["What it is", "When/where you saw it", "Why you want to learn more about it", "And explain what you want to learn more about it."],
                part3: [
                    "1. Why should we protect wild animals?",
                    "2. Why are some people more willing to protect wild animals than others?",
                    "3. Do you think it's important to take children to the zoo to see animals?",
                    "4. Why do some people attach more importance to protecting rare animals?",
                    "5. Should people educate children to protect wild animals?",
                    "6. Is it more important to protect wild animals or the environment?"
                ]
            },
            {
                id: 't_new2', title: "2. 想提升的天赋 (新题) Talent", isNew: true,
                part2: "Describe a natural talent (sports, music, etc.) you want to improve.",
                part2_bullets: ["What it is", "When you discovered it", "How you want to improve it", "And how you feel about it."],
                part3: [
                    "1. Do you think artists with talents should focus on their talents?",
                    "2. Is it possible for us to know whether children who are 3 or 4 years old will become musicians and painters when they grow up?",
                    "3. Why do people like to watch talent shows?",
                    "4. Do you think it is more interesting to watch famous people's or ordinary people's shows?",
                    "5. Do you think it's important to develop children's talents?",
                    "6. Why do some people like to show their talents online?"
                ]
            },
            {
                id: 't_new3', title: "3. 传统故事 (新题) Traditional Story", isNew: true,
                part2: "Describe an interesting traditional story.",
                part2_bullets: ["What the story is about", "When/how you knew it", "Who told you the story", "And explain how you felt when you first heard it."],
                part3: [
                    "1. What kind of stories do children like?",
                    "2. What are the benefits of bedtime stories for children?",
                    "3. Why do most children like listening to stories before bedtime?",
                    "4. What can children learn from stories?",
                    "5. Do all stories for children have happy endings?",
                    "6. Is a good storyline important for a movie?"
                ]
            },
            {
                id: 't_new4', title: "4. 学习朋友好习惯 (新题) Good Habit", isNew: true,
                part2: "Describe a good habit your friend has and you want to develop.",
                part2_bullets: ["Who your friend is", "What habit he/she has", "When you noticed this habit", "And explain why you want to develop this habit."],
                part3: [
                    "1. What habits should children have?",
                    "2. What should parents do to teach their children good habits?",
                    "3. What influences do children with bad habits have on other children?",
                    "4. Why do some habits change when people get older?",
                    "5. How do we develop bad habits?",
                    "6. What can we do to get rid of bad habits?"
                ]
            },
            {
                id: 't_new5', title: "5. 家中重要老物件 (新题) Old Object", isNew: true,
                part2: "Describe an important old thing that your family has kept for a long time.",
                part2_bullets: ["What it is", "How/when your family first got this thing", "How long your family has kept it", "And explain why this thing is important to your family."],
                part3: [
                    "1. What kind of old things do people in your country like to keep?",
                    "2. Why do people keep old things?",
                    "3. What are the differences between the things old people keep and those young people keep?",
                    "4. What are the differences between the things that people keep today and the things that people kept in the past?",
                    "5. What can we see in a museum?",
                    "6. What can we learn from a museum?"
                ]
            },
            {
                id: 't_new6', title: "6. 社交媒体趣事 (新题) Social Media", isNew: true,
                part2: "Describe a time you saw something interesting on social media.",
                part2_bullets: ["When it was", "Where you saw it", "What you saw", "And explain why you think it is interesting."],
                part3: [
                    "1. Why do people like to use social media?",
                    "2. What kinds of things are popular on social media?",
                    "3. What are the advantages and disadvantages of using social media?",
                    "4. What do you think of making friends on social network?",
                    "5. Are there any people who shouldn't use social media?",
                    "6. Do you think people spend too much time on social media?"
                ]
            },
            {
                id: 't_new7', title: "7. 感兴趣的科学学科 (新题) Science", isNew: true,
                part2: "Describe an area/subject of science (biology, robotics, etc.) that you are interested in and would like to learn more about.",
                part2_bullets: ["Which area/subject it is", "When and where you came to know this area/subject", "How you get information about this area/subject", "And explain why you are interested in this area/subject."],
                part3: [
                    "1. Why do some children not like learning science at school?",
                    "2. Is it important to study science at school?",
                    "3. Which science subject is the most important for children to learn?",
                    "4. Should people continue to study science after graduating from school?",
                    "5. How do you get to know about scientific news?",
                    "6. Should scientists explain the research process to the public?"
                ]
            },
            {
                id: 't_new8', title: "8. 有用的书 (新题) Useful Book", isNew: true,
                part2: "Describe a book you read that you found useful.",
                part2_bullets: ["What it is", "When you read it", "Why you think it is useful", "And explain how you felt about it."],
                part3: [
                    "1. What are the types of books that young people like to read?",
                    "2. What should the government do to make libraries better?",
                    "3. Do you think old people spend more time reading than young people?",
                    "4. Which one is better, paper books or e-books?",
                    "5. Have libraries changed a lot with the development of the internet?",
                    "6. What should we do to prevent modern libraries from closing down?"
                ]
            },
            {
                id: 't_new9', title: "9. 童年喜欢的玩具 (新题) Childhood Toy", isNew: true,
                part2: "Describe a toy you liked in your childhood.",
                part2_bullets: ["What kind of toy it is", "When you received it", "How you played it", "And how you felt about it."],
                part3: [
                    "1. How do advertisements influence children?",
                    "2. Should advertising aimed at kids be prohibited?",
                    "3. What's the difference between the toys kids play now and those they played in the past?",
                    "4. Do you think parents should buy more toys for their kids or spend more time with them?",
                    "5. What's the difference between the toys boys play with and girls play with?",
                    "6. What are the advantages and disadvantages of modern toys?"
                ]
            },
            // --- Old Things ---
            { id: 't_old1', title: "10. 健康文章 Health Article", part2: "Describe an article on health you read in a magazine or on the Internet.", part2_bullets: ["What it was", "Where you read it", "Why you read it", "And how you felt about it."], part3: ["1. How do today's people keep healthy?", "2. Is it difficult to keep healthy?", "3. Why can't many people keep healthy?", "4. Where can people find information about keeping healthy?", "5. Do schools have the responsibility to provide health education?", "6. What can parents do to help improve their children's health awareness?"] },
            { id: 't_old2', title: "11. 教别人的技能 Teaching Skill", part2: "Describe a skill (e.g. driving, cooking, etc.) that you think you can teach other people.", part2_bullets: ["What it is", "Who you would like to teach it to", "What you should prepare first", "How you can teach others", "And explain why you think you are good at teaching this skill."], part3: ["1. Should teachers be funny when they teach?", "2. What qualities should teachers have?", "3. Which do you think is more important, practical skills or academic skills?", "4. Which age group is the best at learning new things?", "5. What can be done to improve modern teaching methods?", "6. What are the differences between online and face-to-face teaching?"] },
            { id: 't_old3', title: "12. 漂亮物品 Beautiful Object", part2: "Describe an object that you think is beautiful.", part2_bullets: ["What it is", "Where you saw it", "What it looks like", "And explain why you think it is beautiful."], part3: ["1. Do you think there are more beautiful things now than in the past? Why?", "2. What beautiful scenery spots are there in your country?", "3. Why do you think people create beautiful things?", "4. Where do you think people usually come into contact with beautiful things?", "5. Do people in your country prefer listening to music to appreciating paintings and literature?", "6. Why do many people go to scenic spots in person instead of just reading about them in books?"] },
            { id: 't_old4', title: "13. 想再看的电影 Movie", part2: "Describe a movie you watched recently and would like to watch again.", part2_bullets: ["What type of movie it was", "What it was about", "Where you watched it", "And explain why you would like to watch it again."], part3: ["1. Where do people normally watch movies?", "2. What are the differences between watching movies at home and in a cinema?", "3. Are actors or actresses important to movies? Why?", "4. Why are there fewer people going to the cinema to watch movies nowadays?", "5. What makes a movie a blockbuster?", "6. Why do people of different ages like different types of movies?"] },
            { id: 't_old5', title: "14. 让你自豪的照片 Photo", part2: "Describe a photo you took that you are proud of.", part2_bullets: ["When you took it", "Where you took it", "What is in this photo", "And explain why you are proud of it."], part3: ["1. Why do some people like to record important things with photos?", "2. What can people learn from historical photographs?", "3. Is taking photos the best way to remember something?", "4. Which is better, taking photos or keeping a diary?", "5. When do people take photos?", "6. Why do some people like to keep old photos?"] },
            { id: 't_old6', title: "15. 天空中所见 Sky", part2: "Describe a time when you saw something in the sky (e.g. flying kites, birds, sunset, etc.)", part2_bullets: ["What you saw", "Where/when you saw it/them", "How long you saw it/them", "And explain how you felt about the experience."], part3: ["1. Would people be willing to get up early to watch and enjoy the sunrise?", "2. When would people watch the sky?", "3. Do many people pay attention to the shapes of stars?", "4. What do people usually see in the sky in the daytime?", "5. What are the differences between things people see in the sky in the daytime and at night?", "6. Why do some people like to watch stars at night?"] },
            { id: 't_old7', title: "16. 有名产品的广告 Ad", part2: "Describe an advertisement you have seen that introduced a well-known product.", part2_bullets: ["When and where you saw the advertisement", "What the product was", "How you liked the advertisement", "And explain how you felt about it."], part3: ["1. Where do we often see advertisements?", "2. What are the benefits of advertising?", "3. Are advertisements good or bad for children?", "4. How does advertising affect people?", "5. Do people pay attention to advertisements on public transport?", "6. Do you think it is good to see the same advertisements everywhere?"] },
            { id: 't_old8', title: "17. 有趣小说/故事 Story/Novel", part2: "Describe a story or novel you have read that you found interesting.", part2_bullets: ["When you read it", "What the story or novel was about", "Who wrote it", "And explain why it was interesting."], part3: ["1. Do you prefer to read e-books or printed books?", "2. What kinds of novels are suitable for a film adaptation?", "3. How does technology help people tell stories?", "4. Why are mystery novels so popular nowadays?", "5. Is there any difference between the popular novels now and those in the past?", "6. Why do some people prefer reading novels to playing computer games in this digital world?"] },
            { id: 't_old9', title: "18. 搞笑电影 Comedy", part2: "Describe a film that made you laugh.", part2_bullets: ["What it is", "When you watched it", "Who you watched it with", "And explain why it made you laugh."], part3: ["1. Do people like comedy?", "2. Why do people of all ages like cartoons?", "3. Why do some people like to make others laugh?", "4. Should teachers tell jokes in class?", "5. What kind of people like comedy?", "6. Is it good to tell jokes in business activities?"] },
            { id: 't_old10', title: "19. 塑料废品 Plastic Waste", part2: "Describe a time when you saw a lot of plastic waste (e.g. in a park, on the beach, etc.)", part2_bullets: ["Where and when you saw the plastic waste", "Why there were a lot of plastic waste", "What you did after you saw them", "And explain what your thoughts were about this."], part3: ["1. Do you think we should use plastic products?", "2. How can we reduce our use of plastic?", "3. What kinds of plastic waste are often seen in your country?", "4. Why do people like to use plastic products?", "5. What can the government do to reduce plastic pollution?", "6. Do you think we can do without plastic altogether in the future?"] },
            { id: 't_old11', title: "20. 喜欢的节目 Program", part2: "Describe a program you like to watch.", part2_bullets: ["What it is", "What it is about", "Who you watch it with", "And explain why you like to watch it."], part3: ["1. What programs do people like to watch in your country?", "2. Do people in your country like to watch foreign TV programs?", "3. What's the benefit of letting kids watch animal videos than visiting zoos?", "4. Do teachers play videos in class in your country?", "5. Do you think watching talk shows is a waste of time?", "6. Do you think we can acquire knowledge from watching TV programs?"] },
            { id: 't_old12', title: "21. 二手物品网站 Second-hand", part2: "Describe a website that sells second-hand items.", part2_bullets: ["What it is", "How you found out about it", "What people can buy from it", "And explain whether you like it."], part3: ["1. Some people think it's a waste to buy too many clothes for children. What do you think?", "2. How do people usually handle the clothes they don't want?", "3. Why do people buy second-hand clothes?", "4. What problems will occur if people don't recycle?", "5. Should the government encourage people to recycle items?", "6. How do people in your country recycle various items they don't want?"] },
        ],
        places: [
            // --- New Places ---
            {
                id: 'pl_new1', title: "1. 自然之地 (新题) Natural Place", isNew: true,
                part2: "Describe a natural place (e.g. parks, mountains, etc.)",
                part2_bullets: ["Where this place is", "How you knew this place", "What it is like", "And explain why you like to visit it."],
                part3: [
                    "1. What kind of people like to visit natural places?",
                    "2. What are the differences between a natural place and a city?",
                    "3. Do you think that going to the park is the only way to get close to nature?",
                    "4. What can people gain from going to natural places?",
                    "5. Are there any wild animals in the city?",
                    "6. Do you think it is a good idea to let animals stay in local parks for people to see?"
                ]
            },
            {
                id: 'pl_new2', title: "2. 有趣但不寻常建筑 (新题) Unusual Building", isNew: true,
                part2: "Describe an unusual but interesting building you would like to visit.",
                part2_bullets: ["Where it is", "What it looks like", "Why you think it is unusual and interesting", "And explain why you would like to visit it."],
                part3: [
                    "1. Why do some people choose to build houses by themselves?",
                    "2. What factors do you consider when choosing a house or an apartment?",
                    "3. Do you think a city's buildings affect its vibe or atmosphere?",
                    "4. Do you think old buildings should be preserved?"
                ]
            },
            // --- Old Places ---
            { id: 'pl_old1', title: "3. 商店 Shop", part2: "Describe a shop/store you enjoy visiting.", part2_bullets: ["What the shop's name is", "Where it is", "How often you visit it", "And explain why you like to visit it."], part3: ["1. Do people in your country go to the shopping mall frequently?", "2. How have people's shopping habits changed in recent decades?", "3. Do you think shops and shopping malls will disappear in the future?", "4. What are the differences between shopping in street markets and big shopping malls?", "5. What are the differences in the shopping habits of different age groups?", "6. What are the differences between shopping online and in-store?"] },
            { id: 'pl_old2', title: "4. 想再去的城市 City", part2: "Describe a city that you have been to and would like to visit again.", part2_bullets: ["When you visited it", "What you did there", "What it was like", "And explain why you would like to visit it again."], part3: ["1. What's the difference between the city and the countryside?", "2. Some people say large cities are suitable for old people. What do you think?", "3. Do you think it is possible that all of the population move to cities?", "4. Do you think people in the countryside are friendlier than people in the city?", "5. Are there any changes in your city?", "6. What should the government do to improve citizens' safety?"] },
            { id: 'pl_old3', title: "5. 受欢迎的运动场所 Sports Place", part2: "Describe a popular place for sports (e.g. a stadium) that you’ve been to.", part2_bullets: ["Where it is", "When you went there", "What you did there", "And explain how you felt about this place."], part3: ["1. Do young people like to do sports?", "2. What are the benefits of sports for children?", "3. Is it necessary to build public sports spaces?", "4. What do you think of companies donating sports venues for poor children?", "5. Is technology helpful for people to do sports?", "6. Do you think local sports teams can help increase community connections?"] },
            { id: 'pl_old4', title: "6. 安静的地方 Quiet Place", part2: "Describe a quiet place you like to go.", part2_bullets: ["Where it is", "How you knew it", "How often you go there", "What you do there", "And explain how you feel about the place."], part3: ["1. Is it easy to find quiet places in your country? Why?", "2. How do people spend their leisure time in your country?", "3. How does technology affect the way people spend their leisure time?", "4. Do you think only old people have time for leisure?", "5. Why do old people prefer to live in quiet places?", "6. Why are there more noises made at home now than in the past?"] },
            { id: 'pl_old5', title: "7. 向游客推荐本国旅游地 Recommend Place", part2: "Describe a place in your country or part of your country that you would like to recommend to visitors/travelers.", part2_bullets: ["What it is", "Where it is", "What people can do there", "And explain why you would like to recommend it to visitors/travelers."], part3: ["1. Is it important to take photos while traveling?", "2. Can you trust other people's travel journals on the Internet?", "3. What factors affect how people feel about traveling?", "4. Will you go to a foreign country to travel because of the distinct landscape?", "5. How can tourists have a good travel experience?", "6. What kinds of comments do travelers typically leave online after a trip?"] },
            { id: 'pl_old6', title: "8. 看到动物的地方 Animal Place", part2: "Describe a place where you saw many animals.", part2_bullets: ["When you went there", "Who you went with", "What animals you saw there", "And explain how you felt about the place."], part3: ["1. Why do stories and movies for children always feature animals?", "2. How did animals help people in the past?", "3. How do animals help us today?", "4. Do you think people are more interested in animals now than they were in the past?", "5. Why should we protect animals?", "6. Do you think children love animals more than old people do?"] },
            { id: 'pl_old7', title: "9. 常去的熟人之家 Someone's Home", part2: "Describe the home of someone you know well and that you often visit.", part2_bullets: ["Whose home it is", "How often you go there", "What it is like", "And explain how you feel about the home."], part3: ["1. What are the differences between buildings in the city and in the countryside?", "2. Do you prefer to live in the city or in the countryside?", "3. What safety risks are there in residential buildings in cities?", "4. Is it expensive to decorate a house or an apartment in the place where you live?", "5. Do you think the location is a key factor in where people choose to live?", "6. What is the role of plants in home decoration?"] },
            { id: 'pl_old8', title: "10. 户外活动之地 Outdoor Activity Place", part2: "Describe a place you went to and an outdoor activity you did there.", part2_bullets: ["Where it was", "When you went there", "What outdoor activity you did there", "Why you went there and did the activity", "And explain how you felt about it."], part3: ["1. What sports do young people like?", "2. What kind of people do extreme sports?", "3. Why are some people willing to try dangerous extreme sports?", "4. Should people take more into account the risks that extreme sports may bring?", "5. Why do people keep inventing new and slightly dangerous sports?", "6. What risks are there in extreme sports, and who takes these consequences?"] },
        ],
        people: [
            // --- New People ---
            {
                id: 'pp_new1', title: "1. 擅长音乐的朋友 (新题) Friend Music", isNew: true,
                part2: "Describe a friend of yours who is good at music/singing.",
                part2_bullets: ["Who he/she is", "When/where you listen to him/her", "What kind of music/songs he/she is good at", "And explain how you feel when listening to his/her music/singing."],
                part3: [
                    "1. What kind of music is popular in your country?",
                    "2. What kind of music do young people like?",
                    "3. What are the differences between young people's and old people's preferences in music?",
                    "4. What are the benefits of children learning a musical instrument?",
                    "5. Do you know what kind of music children like today?",
                    "6. Do you think the government should invest more money in concerts?"
                ]
            },
            {
                id: 'pp_new2', title: "2. 重要的好朋友 (新题) Important Friend", isNew: true,
                part2: "Describe a good friend who is important to you.",
                part2_bullets: ["Who he/she is", "How/where you got to know him/her", "How long you have known each other", "And explain why he/she is important to you."],
                part3: [
                    "1. How do children make friends at school?",
                    "2. How do children make friends when they are not at school?",
                    "3. Do you think it is better for children to have a few close friends or many casual friends?",
                    "4. Do you think a child's relationship with friends can be replaced by that with other people, like parents or other family members?",
                    "5. What are the differences between friends made inside and outside the workplace?",
                    "6. Do you think it's possible for bosses and their employees to become friends?"
                ]
            },
            {
                id: 'pp_new3', title: "3. 在家族企业工作的人 (新题) Family Business", isNew: true,
                part2: "Describe a person you know who enjoys working for a family business (e.g. a shop, etc.).",
                part2_bullets: ["Who he/she is", "What the business is", "What his/her job is", "And explain why he/she enjoys working there."],
                part3: [
                    "1. Would you like to start a family business?",
                    "2. Would you like to work for a family business?",
                    "3. Why do some people choose to start their own company?",
                    "4. What are the advantages and disadvantages of family businesses?",
                    "5. What family businesses do you know in your local area?",
                    "6. What makes a successful family business?"
                ]
            },
            {
                id: 'pp_new4', title: "4. 钦佩的有创造力的人 (新题) Creative Person", isNew: true,
                part2: "Describe a creative person (e.g. an artist, a musician, an architect, etc.) you admire.",
                part2_bullets: ["Who he/she is", "How you knew him/her", "What his/her greatest achievement is", "And explain why you think he/she is creative."],
                part3: [
                    "1. Do you think children should learn to play musical instruments?",
                    "2. How do artists acquire inspiration?",
                    "3. Do you think pictures and videos in news reports are important?",
                    "4. What can we do to help children keep creative?",
                    "5. How does drawing help to enhance children's creativity?",
                    "6. What kind of jobs require creativity?"
                ]
            },
            {
                id: 'pp_new5', title: "5. 钦佩的运动员 (新题) Sportsperson", isNew: true,
                part2: "Describe a successful sportsperson you admire.",
                part2_bullets: ["Who he/she is", "What you know about him/her", "What he/she is like in real life", "What achievement he/she has made", "And explain why you admire him/her."],
                part3: [
                    "1. Should students have physical education and do sports at school?",
                    "2. What qualities should an athlete have?",
                    "3. Is talent important in sports?",
                    "4. Is it easy to identify children's talents?",
                    "5. What is the most popular sport in your country?",
                    "6. Why are there so few top athletes?"
                ]
            },
            {
                id: 'pp_new_nm1', title: "6. 受欢迎的人 (非大陆) Popular Person", isNew: true,
                part2: "Describe a popular person.",
                part2_bullets: ["Who this person is", "What kind of person he/she is", "When you see him/her normally", "And explain why you think this person is popular."],
                part3: [
                    "1. Why are some students popular in school?",
                    "2. Is it important for a teacher to be popular?",
                    "3. Do you think good teachers are always popular among students?",
                    "4. What are the qualities of being a good teacher?",
                    "5. Is it easier to become popular nowadays?",
                    "6. Why do people want to be popular?"
                ]
            },
            // --- Old People ---
            { id: 'pp_old1', title: "7. 侍花弄果之人 Plants Person", part2: "Describe a person you know who loves to grow plants (e.g. vegetables/fruits/flowers etc.).", part2_bullets: ["Who this person is", "What he/she grows", "Where he/she grows them", "And explain why he/she enjoys growing plants."], part3: ["1. Are there many people growing their own vegetables now?", "2. Do you think it's good to let kids learn how to plant?", "3. What do you think of the job of a farmer?", "4. What are the differences between traditional and modern agriculture?", "5. What happened to the farmers' income during the pandemic?", "6. How do people grow plants in cities?"] },
            { id: 'pp_old2', title: "8. 聪明的人 Intelligent Person", part2: "Describe an intelligent person you know.", part2_bullets: ["Who this person is", "How you knew this person", "What this person does", "And explain why you think this person is intelligent."], part3: ["1. Who do you think plays a more important role in a child's development, teachers or parents?", "2. Do you think smart people tend to be selfish?", "3. Are smart people happier than others?", "4. What games can help children become more intelligent?", "5. Do you think it is necessary for managers to share their experience with their subordinates?", "6. Do you think an intelligence test is a must in company recruitment?"] },
            { id: 'pp_old3', title: "9. 会打扮的朋友 Well-dressed", part2: "Describe a friend of yours who is well-dressed and is good at dressing up.", part2_bullets: ["Who he/she is", "How you knew him/her", "What his/her dressing style is", "And explain why he/she dresses this way."], part3: ["1. Do most people in your country prefer to buy clothes online or at the street market? Why?", "2. Do you think young people know more about fashion and are better at dressing up than elderly people?", "3. Do you think people would use clothing to show their identity?", "4. Why do many people prefer to buy rather expensive clothes?", "5. What are the differences between cheap and expensive clothes?", "6. Why do some people care so much about their clothing?"] },
            { id: 'pp_old4', title: "10. 由不喜欢到喜欢的朋友 Disliked Friend", part2: "Describe a person you disliked at first but ended up being friends with.", part2_bullets: ["Who he/she is", "How you knew him/her", "Why you disliked him/her at first but changed your mind", "And explain how you feel about the experience."], part3: ["1. What do you think of making friends online?", "2. Is it a good idea to make friends with people who are much older than you?", "3. Do you enjoy meeting new people?"] },
            { id: 'pp_old5', title: "11. 劝你的人 Persuaded You", part2: "Describe a time when a person persuaded you to do something and you were happy about that.", part2_bullets: ["Who he/she was", "When/where it happened", "What he/she persuaded you to do", "And explain why you were happy."], part3: ["1. What impact does advertising have on children and their parents?", "2. What do parents often persuade their children to do?", "3. Who do children listen to more, their parents or their teachers? Why?", "4. What are some good ways to persuade children?", "5. What advice should young people follow?", "6. How do advertisements persuade people?"] },
            { id: 'pp_old6', title: "12. 熊孩子 Naughty Child", part2: "Describe a time when you saw children behave badly in public.", part2_bullets: ["Where it was", "What the children were doing", "How others reacted to it", "And explain how you felt about it."], part3: ["1. What bad behavior do children usually have?", "2. How should parents stop their children from behaving badly in public?", "3. Are parents these days stricter than those in the past?", "4. Whose influence on children is more important? Friends' or parents'?", "5. Who is to blame when children have bad behaviors, the parents or the children themselves?", "6. What effect does it have on children when their parents punish them for their bad behaviors?"] },
            { id: 'pp_old7', title: "13. 激励你做有趣事情的人 Inspired Person", part2: "Describe a person who inspired you to do something interesting.", part2_bullets: ["Who he/she is", "How you knew him/her", "What interesting thing you did", "And explain how he/she inspired you to do it."], part3: ["1. What qualities make someone a role model?", "2. Why should children learn from role models?", "3. Who can influence children more, teachers or parents?", "4. What kind of international news inspires people?", "5. Besides parents and teachers, who else can motivate children?", "6. Can online teaching motivate students to learn? How?"] },
            { id: 'pp_old8', title: "14. 发小 Childhood Friend", part2: "Describe a friend from your childhood.", part2_bullets: ["Who he/she is", "Where and how you met each other", "What you often did together", "And explain what made you like him/her."], part3: ["1. Do you still keep in touch with your friends from childhood? Why or why not?", "2. How important is childhood friendship to children?", "3. What do you think of communicating via social media?", "4. Do you think online communication through social media will replace face-to-face communication?", "5. What's the difference between having younger friends and older friends?", "6. Has technology changed people's friendships? How?"] },
            { id: 'pp_old9', title: "15. 不同文化的朋友 Cultural Friend", part2: "Describe a person from a different cultural background with whom you enjoy spending time.", part2_bullets: ["Who he/she is", "Where he/she is from", "Where/how you knew him/her", "And explain how you feel about him/her."], part3: ["1. Is it easy to meet people from different cultural backgrounds in your country?", "2. What do people from different cultural backgrounds usually talk about with each other?", "3. Is it good to live in a multicultural society?", "4. What are the advantages of being friends with people from different cultural backgrounds?", "5. Why do people choose to travel or live abroad?", "6. What are the benefits of living in another country?"] },
            { id: 'pp_old10', title: "16. 奇装异服的人 Unusual Clothes", part2: "Describe a person who you think wears unusual clothes.", part2_bullets: ["Who this person is", "How you knew this person", "What his/her clothes are like", "And explain why you think his/her clothes are unusual."], part3: ["1. What are the differences between clothes worn by old people and those by young people?", "2. What kind of clothes do people wear in the workplace?", "3. Do you think it is a good idea to buy clothes online?", "4. Do you think young people wear unusual clothes more than other age groups?", "5. Do you think that the style of the clothing is more important than its comfort?", "6. What factors affect people's decisions when buying clothes?"] },
            { id: 'pp_old11', title: "17. 喜欢的歌手 Singer", part2: "Describe a singer whose music/songs you like.", part2_bullets: ["Who he/she is", "What genre his/her music belongs to", "When/where you listen to his/her music/songs", "And explain why you like him/her and his/her music."], part3: ["1. What kind of music do people like at different ages?", "2. What kind of music is popular in China now and what kind will be in the future?", "3. Do Chinese parents require their children to learn to play musical instruments?", "4. Why do some people like to listen to live music while others prefer CDs?", "5. Can anyone learn how to sing?", "6. What should the government do to help people with musical talent?"] },
            { id: 'pp_old12', title: "18. 聊得来的有趣老人 Old Person", part2: "Describe an old person who has an interesting life and you enjoy talking to him/her.", part2_bullets: ["Where he/she lives", "What his/her life is like", "What you like to talk about with him/her", "And explain why you enjoy talking to him/her."], part3: ["1. Should companies employ older workers?", "2. What do you think older people can contribute at work?", "3. Why do governments make retirement policies?", "4. When do you think is the best time to retire?", "5. Do you think people should spend more time with their grandparents?", "6. Is it beneficial to live with elderly people?"] },
        ]
    }
};

// --- Components ---

// Simple Markdown Renderer with Tap-to-Define support
const renderMarkdown = (text: string, onWordClick: (word: string, rect: DOMRect) => void) => {
    return text.split('\n').map((line, i) => {
        if (line.startsWith('**')) return <h3 key={i} className="font-bold mt-4 mb-2 text-gray-900">{line.replace(/\*\*/g, '')}</h3>;
        if (line.startsWith('* ')) return <li key={i} className="ml-4 text-gray-700">{line.replace('* ', '')}</li>;
        
        // Split paragraph into words for click handling
        const words = line.split(/(\s+)/); // Keep delimiters (spaces)
        return (
            <p key={i} className="mb-2 text-gray-700 leading-relaxed">
                {words.map((word, wIdx) => {
                    if (word.trim() === '') return word; // Return spaces as is
                    return (
                        <span 
                            key={wIdx} 
                            className="cursor-pointer hover:bg-blue-100 rounded px-0.5 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                // Clean word from punctuation for the dictionary lookup
                                const cleanWord = word.replace(/[^\w\s\u4e00-\u9fa5'-]/g, '');
                                if (cleanWord) onWordClick(cleanWord, rect);
                            }}
                        >
                            {word}
                        </span>
                    );
                })}
            </p>
        );
    });
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URL prefix (e.g., "data:image/png;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

// Audio decoding helper
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
}

function decodeBase64(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// --- Components for iOS Style ---
const IOSHeader = ({ title, onBack, rightElement }: { title: string, onBack?: () => void, rightElement?: React.ReactNode }) => (
    <div className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-200 px-4 h-14 flex items-center justify-between transition-all">
        <div className="w-20 flex justify-start">
            {onBack && (
                <button 
                    onClick={onBack}
                    className="text-blue-500 font-medium flex items-center active:opacity-50 transition-opacity"
                >
                    <span className="text-xl mr-1">‹</span> Back
                </button>
            )}
        </div>
        <h1 className="font-semibold text-gray-900 truncate flex-1 text-center text-base">{title}</h1>
        <div className="w-20 flex justify-end">
            {rightElement}
        </div>
    </div>
);

// --- Main App ---

function App(): React.ReactElement {
    const [view, setView] = useState<ScreenState>('home');
    const [apiKey] = useState(process.env.API_KEY || '');
    
    // Helper State
    const [helperTab, setHelperTab] = useState<'part1' | 'events' | 'things' | 'places' | 'people'>('part1');
    const [selectedTopic, setSelectedTopic] = useState<any>(null);
    const [chatHistory, setChatHistory] = useState<ChatHistory>({});
    
    // Practice Mode State
    const [practiceIndex, setPracticeIndex] = useState(0);
    const [currentInput, setCurrentInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

    // Dictionary Popover State
    const [dictPopup, setDictPopup] = useState<{word: string, rect: DOMRect, definition: string, isLoading: boolean} | null>(null);
    
    // Writing State
    const [writingTask, setWritingTask] = useState<'task1' | 'task2'>('task2');
    const [essayInput, setEssayInput] = useState('');
    const [essayTopic, setEssayTopic] = useState('');
    const [writingImage, setWritingImage] = useState<File | null>(null);
    const [writingImagePreview, setWritingImagePreview] = useState<string | null>(null);
    const [writingAnalysis, setWritingAnalysis] = useState<string>('');

    const aiRef = useRef<GoogleGenAI | null>(null);

    useEffect(() => {
        if (apiKey) {
            aiRef.current = new GoogleGenAI({ apiKey });
        }
    }, [apiKey]);

    // --- Helpers for Practice Mode ---

    const getSlidesForTopic = (topic: any) => {
        const slides: Array<{type: 'p1' | 'p2' | 'p3', text: string, bullets?: string[], id: string}> = [];
        
        if (topic.questions) { // Part 1 Topic
            topic.questions.forEach((q: string, i: number) => {
                slides.push({ type: 'p1', text: q, id: `${topic.id}_p1_${i}` });
            });
        } else if (topic.part2) { // Part 2&3 Topic
            // Part 2 Card
            slides.push({ 
                type: 'p2', 
                text: topic.part2, 
                bullets: topic.part2_bullets, 
                id: `${topic.id}_p2` 
            });
            // Part 3 Questions
            if (topic.part3) {
                 topic.part3.forEach((q: string, i: number) => {
                    slides.push({ type: 'p3', text: q, id: `${topic.id}_p3_${i}` });
                });
            }
        }
        return slides;
    };

    const currentSlides = useMemo(() => selectedTopic ? getSlidesForTopic(selectedTopic) : [], [selectedTopic]);
    const currentSlide = currentSlides[practiceIndex];
    const currentChatId = currentSlide ? currentSlide.id : '';

    const callAI = async (messagesForContext: ChatMessage[], topicTitle: string, question: string, bullets: string[] | undefined, targetIndex: number, chatId: string) => {
        setIsGenerating(true);
        try {
            const contextText = messagesForContext.slice(0, -1).map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`).join('\n');
            const lastUserMsg = messagesForContext[messagesForContext.length - 1];
            
            const prompt = `You are a strict IELTS Speaking examiner.
            Topic: ${topicTitle}
            Current Question: ${question}
            ${bullets ? `Task Card Bullets: ${bullets.join(', ')}` : ''}

            Conversation History:
            ${contextText}
            Student: ${lastUserMsg.text}

            Your Task:
            1. Evaluate the student's answer based on the **4 Official IELTS Criteria**: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation.
            2. Provide concise feedback.
            3. Provide a **Band 7.0 Answer**: Natural, idiomatic spoken English. **Must be concise**.
            4. Provide a **Band 8.0 Answer**: Sophisticated, native-like coherence. **Must be concise**.
            
            **CRITICAL**: 
            - Answers must be spoken style (not written essays).
            - Provide Chinese translations for the answers clearly separated.
            
            Structure your response exactly like this:
            [Bulleted Feedback based on 4 criteria]
            
            **Band 7.0 Version**
            [English Answer Paragraph]
            (Translation: [Chinese Translation])
            
            **Band 8.0 Version**
            [English Answer Paragraph]
            (Translation: [Chinese Translation])
            `;

            let fullResponse = '';
            const result = await aiRef.current!.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            for await (const chunk of result) {
                fullResponse += (chunk.text || '');
                setChatHistory(prev => {
                    const newHistory = [...(prev[chatId] || [])];
                    if (newHistory[targetIndex]) {
                         newHistory[targetIndex] = { ...newHistory[targetIndex], text: fullResponse, isTyping: false };
                    }
                    return { ...prev, [chatId]: newHistory };
                });
            }
        } catch (e) {
            console.error(e);
             setChatHistory(prev => {
                const newHistory = [...(prev[chatId] || [])];
                if (newHistory[targetIndex]) {
                        newHistory[targetIndex] = { ...newHistory[targetIndex], text: "Error generating response. Please try again.", isTyping: false };
                }
                return { ...prev, [chatId]: newHistory };
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendMessage = async () => {
        if (!currentInput.trim() || !aiRef.current || !currentSlide) return;
        
        const userMsg: ChatMessage = { role: 'user', text: currentInput };
        const aiPlaceholderMsg: ChatMessage = { role: 'ai', text: '', isTyping: true };
        
        const nextIndex = (chatHistory[currentChatId] || []).length + 1; // Index of AI msg

        setChatHistory(prev => ({
            ...prev,
            [currentChatId]: [...(prev[currentChatId] || []), userMsg, aiPlaceholderMsg]
        }));
        
        const inputToUse = currentInput;
        setCurrentInput('');

        // Prepare context including the new user message
        const currentMessages = [...(chatHistory[currentChatId] || []), userMsg, aiPlaceholderMsg];

        await callAI(
            currentMessages.slice(0, -1), // Context excludes the placeholder
            selectedTopic.title,
            currentSlide.text,
            currentSlide.bullets,
            nextIndex,
            currentChatId
        );
    };

    const handleRegenerateMessage = async (aiMsgIndex: number) => {
        if (!aiRef.current || !currentSlide) return;
        
        // Ensure there is a preceding user message
        if (aiMsgIndex === 0) return; 

        // Set typing state
        setChatHistory(prev => {
            const newHistory = [...(prev[currentChatId] || [])];
            newHistory[aiMsgIndex] = { ...newHistory[aiMsgIndex], text: '', isTyping: true };
            return { ...prev, [currentChatId]: newHistory };
        });

        const currentMessages = chatHistory[currentChatId] || [];
        // Context is everything up to the user message before this AI message
        const contextMessages = currentMessages.slice(0, aiMsgIndex);

        await callAI(
            contextMessages,
            selectedTopic.title,
            currentSlide.text,
            currentSlide.bullets,
            aiMsgIndex,
            currentChatId
        );
    };

    const handleDeleteExchange = (aiMsgIndex: number) => {
        setChatHistory(prev => {
            const history = [...(prev[currentChatId] || [])];
            // Remove the AI message and the preceding User message
            if (aiMsgIndex > 0) {
                history.splice(aiMsgIndex - 1, 2);
            } else {
                history.splice(aiMsgIndex, 1);
            }
            return { ...prev, [currentChatId]: history };
        });
    };

    const playTTS = async (text: string, id: string) => {
        if (!aiRef.current) return;
        if (playingMessageId === id) return;

        setPlayingMessageId(id);
        
        // Strip out Chinese translation for TTS if present in format "(Translation: ...)"
        const textToRead = text.split('(Translation:')[0].trim();

        try {
            const response = await aiRef.current.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: textToRead.substring(0, 400) }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Fenrir' },
                        },
                    },
                },
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioData) {
                 const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                 const audioBuffer = await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
                 const source = ctx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(ctx.destination);
                 source.start(0);
                 source.onended = () => setPlayingMessageId(null);
            } else {
                setPlayingMessageId(null);
            }

        } catch (e) {
            console.error("TTS Error", e);
            setPlayingMessageId(null);
            alert("Failed to play audio. Please try again.");
        }
    };

    // --- Dictionary Logic ---
    const handleWordClick = async (word: string, rect: DOMRect) => {
        if (!aiRef.current) return;
        setDictPopup({ word, rect, definition: '', isLoading: true });
        
        try {
             const result = await aiRef.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Define "${word}" concisely in English and Chinese for an IELTS student.`,
             });
             setDictPopup(prev => prev ? { ...prev, definition: result.text || 'No definition found.', isLoading: false } : null);
        } catch (e) {
            setDictPopup(prev => prev ? { ...prev, definition: 'Error fetching definition.', isLoading: false } : null);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setWritingImage(file);
            const reader = new FileReader();
            reader.onload = (ev) => {
                setWritingImagePreview(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleWritingAnalyze = async () => {
         if (!aiRef.current) return;
         
         if (writingTask === 'task1' && !writingImage) {
             alert('Please upload an image for Task 1.');
             return;
         }
         if (!essayInput.trim()) {
             alert('Please enter your report/essay.');
             return;
         }

         setWritingAnalysis('Analyzing...');
         setView('writing-results');
         
         try {
             let result;
             
             if (writingTask === 'task1' && writingImage) {
                const base64Image = await fileToBase64(writingImage);
                const prompt = `Analyze this IELTS Writing Task 1 report based on the provided image (chart/graph/diagram).
                
                Student Report: 
                ${essayInput}

                Provide:
                1. Estimated Band Score (0-9)
                2. Feedback on Task Achievement (Did they accurately describe the data?), Coherence & Cohesion, Lexical Resource, Grammatical Range.
                3. A corrected, high-band version of the report based on the image data.`;

                result = await aiRef.current.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: writingImage.type, data: base64Image } },
                            { text: prompt }
                        ]
                    }
                });

             } else {
                 // Task 2
                 const prompt = `Analyze this IELTS Writing Task 2 essay.
                 Topic/Question: ${essayTopic}
                 
                 Student Essay: 
                 ${essayInput}
                 
                 Provide:
                 1. Estimated Band Score (0-9)
                 2. Feedback on Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range.
                 3. A corrected, high-band version of the essay.`;
                 
                 result = await aiRef.current.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                 });
             }

             setWritingAnalysis(result.text || '');
         } catch (e) {
             console.error(e);
             setWritingAnalysis('Error analyzing writing. Please try again.');
         }
    };

    const renderHome = () => (
        <div className="min-h-screen bg-[#F2F2F7]">
            <div className="pt-16 pb-8 px-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">IELTS Master</h1>
                <p className="text-gray-500 text-sm mb-8">AI-Powered Preparation</p>
                
                <div className="space-y-4">
                    <button 
                        onClick={() => setView('answer-helper-list')}
                        className="w-full bg-white p-5 rounded-2xl shadow-sm flex items-center space-x-4 active:scale-95 transition-transform duration-200"
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">📚</div>
                        <div className="text-left flex-1">
                            <h2 className="font-semibold text-gray-900 text-lg">Question Bank</h2>
                            <p className="text-gray-500 text-sm">2025 Sep-Dec Topics</p>
                        </div>
                        <span className="text-gray-300">›</span>
                    </button>

                    <button 
                        onClick={() => setView('speaking-intro')}
                        className="w-full bg-white p-5 rounded-2xl shadow-sm flex items-center space-x-4 active:scale-95 transition-transform duration-200"
                    >
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">🎙️</div>
                        <div className="text-left flex-1">
                            <h2 className="font-semibold text-gray-900 text-lg">Mock Exam</h2>
                            <p className="text-gray-500 text-sm">Real-time AI Examiner</p>
                        </div>
                        <span className="text-gray-300">›</span>
                    </button>

                    <button 
                        onClick={() => setView('writing-input')}
                        className="w-full bg-white p-5 rounded-2xl shadow-sm flex items-center space-x-4 active:scale-95 transition-transform duration-200"
                    >
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl">✍️</div>
                        <div className="text-left flex-1">
                            <h2 className="font-semibold text-gray-900 text-lg">Writing Check</h2>
                            <p className="text-gray-500 text-sm">Instant Scoring</p>
                        </div>
                        <span className="text-gray-300">›</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderHelperList = () => {
        const tabs: { id: 'part1' | 'events' | 'things' | 'places' | 'people'; label: string; }[] = [
            { id: 'part1', label: 'Part 1' },
            { id: 'events', label: 'Events' },
            { id: 'things', label: 'Things' },
            { id: 'places', label: 'Places' },
            { id: 'people', label: 'People' },
        ];

        let list: any[] = [];
        if (helperTab === 'part1') {
            list = FULL_QUESTION_BANK.part1;
        } else {
            list = (FULL_QUESTION_BANK.part23 as any)[helperTab] || [];
        }

        return (
            <div className="bg-[#F2F2F7] min-h-screen pb-20">
                <IOSHeader title="Topic Bank" onBack={() => setView('home')} />
                
                {/* iOS Segmented Control */}
                <div className="px-4 py-3 sticky top-14 z-40 bg-[#F2F2F7]/95 backdrop-blur">
                    <div className="bg-gray-200/80 p-1 rounded-lg flex overflow-x-auto no-scrollbar">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setHelperTab(tab.id as any)}
                                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                                    helperTab === tab.id 
                                    ? 'bg-white text-black shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Inset Grouped List */}
                <div className="px-4 space-y-3">
                    {list.map((item: any) => (
                        <div 
                            key={item.id} 
                            onClick={() => { 
                                setSelectedTopic(item); 
                                setPracticeIndex(0);
                                setCurrentInput('');
                                setView('answer-helper-practice'); 
                            }}
                            className="bg-white p-4 rounded-xl shadow-sm active:bg-gray-50 transition-colors flex justify-between items-center cursor-pointer"
                        >
                            <span className="font-medium text-gray-900 line-clamp-2 flex-1">{item.title}</span>
                            {item.isNew && (
                                <span className="ml-3 bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">New</span>
                            )}
                            <span className="ml-2 text-gray-300 text-xl">›</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderPracticeView = () => {
        if (!selectedTopic || !currentSlide) return null;

        const messages = chatHistory[currentChatId] || [];
        const isPart2 = currentSlide.type === 'p2';

        const renderMessageContent = (msg: ChatMessage, msgIndex: number) => {
            if (msg.role === 'user') return msg.text;
            if (msg.isTyping && !msg.text) return <span className="animate-pulse">Analyzing & Improving...</span>;

            // AI Message Parsing
            const band7Regex = /\*\*Band 7\.0 Version\*\*[:：]?/i;
            const band8Regex = /\*\*Band 8\.0 Version\*\*[:：]?/i;

            const parts7 = msg.text.split(band7Regex);
            const feedbackPart = parts7[0];
            const remainingPart = parts7[1] || '';
            
            const parts8 = remainingPart.split(band8Regex);
            const band7Text = parts8[0];
            const band8Text = parts8[1] || '';

            // Render function helper
            const renderSection = (title: string, content: string, colorClass: string, audioId: string) => (
                 <div className="border-t border-gray-100 pt-3 mt-3">
                    <h3 className="font-bold text-gray-900 text-sm mb-2 flex items-center justify-between">
                        <span className="flex items-center">
                             <span className={`w-1 h-4 ${colorClass} rounded-full mr-2`}></span>
                             {title}
                        </span>
                    </h3>
                    <div className={`p-3 rounded-lg text-gray-800 text-sm leading-relaxed relative pb-8 ${colorClass.replace('bg-', 'bg-').replace('500', '50')}`}>
                        {renderMarkdown(content, handleWordClick)}
                        <button 
                            onClick={(e) => { e.stopPropagation(); playTTS(content, audioId); }}
                            className={`absolute bottom-2 right-2 flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all shadow-sm ${
                                playingMessageId === audioId 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-white text-gray-500 hover:bg-gray-100'
                            }`}
                        >
                            {playingMessageId === audioId ? '🔊 Playing...' : '🔊 Listen'}
                        </button>
                    </div>
                </div>
            );

            return (
                <div>
                    <div className="mb-4">
                        {renderMarkdown(feedbackPart, handleWordClick)}
                    </div>
                    
                    {band7Text && renderSection("Band 7.0 Version", band7Text, "bg-blue-500", `${currentChatId}_${msgIndex}_7`)}
                    {band8Text && renderSection("Band 8.0 Version", band8Text, "bg-purple-500", `${currentChatId}_${msgIndex}_8`)}

                    {/* Toolbar */}
                    <div className="flex justify-end items-center space-x-2 mt-4 pt-2 border-t border-gray-100">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleRegenerateMessage(msgIndex); }}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                            title="Regenerate Answer"
                        >
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 4v6h-6"></path>
                                <path d="M1 20v-6h6"></path>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                        </button>
                        <button 
                             onClick={(e) => { e.stopPropagation(); if(confirm('Delete this exchange?')) handleDeleteExchange(msgIndex); }}
                             className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                             title="Delete"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            );
        };

        return (
            <div className="bg-[#F2F2F7] min-h-screen flex flex-col fixed inset-0" onClick={() => setDictPopup(null)}>
                <IOSHeader 
                    title={selectedTopic.title} 
                    onBack={() => {
                        setView('answer-helper-list');
                        setPracticeIndex(0);
                    }}
                    rightElement={
                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={() => {
                                    if(confirm('Clear all conversation history for this topic?')) {
                                        setChatHistory(prev => ({ ...prev, [currentChatId]: [] }));
                                    }
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                            <span className="text-gray-500 text-xs font-mono">
                                {practiceIndex + 1}/{currentSlides.length}
                            </span>
                        </div>
                    }
                />
                
                {/* Pagination Arrows */}
                <button
                    onClick={() => setPracticeIndex(prev => Math.max(0, prev - 1))}
                    disabled={practiceIndex === 0}
                    className="fixed left-2 top-1/2 -translate-y-1/2 z-30 p-2 text-gray-400 hover:text-blue-500 disabled:opacity-0 transition-all"
                >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>

                <button
                    onClick={() => setPracticeIndex(prev => Math.min(currentSlides.length - 1, prev + 1))}
                    disabled={practiceIndex === currentSlides.length - 1}
                    className="fixed right-2 top-1/2 -translate-y-1/2 z-30 p-2 text-gray-400 hover:text-blue-500 disabled:opacity-0 transition-all"
                >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </button>

                {/* Main Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto pb-48 px-8" id="chat-container"> 
                    <div className="py-6 space-y-6">
                        
                        {/* Question Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50">
                            <div className="flex justify-between items-center mb-4">
                                <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded ${
                                    currentSlide.type === 'p2' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {currentSlide.type === 'p1' ? 'Part 1' : currentSlide.type === 'p2' ? 'Part 2 Task Card' : 'Part 3 Discussion'}
                                </span>
                            </div>

                            <h2 className="text-xl font-bold text-gray-900 mb-4 leading-relaxed">
                                {currentSlide.text}
                            </h2>

                            {isPart2 && currentSlide.bullets && (
                                <ul className="space-y-3 bg-gray-50 p-4 rounded-xl">
                                    {currentSlide.bullets.map((b, i) => (
                                        <li key={i} className="flex items-start text-gray-700 text-sm">
                                            <span className="mr-2 text-blue-400 mt-0.5">•</span>
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Chat History */}
                        <div className="space-y-4">
                            {messages.length === 0 && (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    Type your answer below for instant Band 7.0 & 8.0 AI feedback.
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[95%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative ${
                                        msg.role === 'user' 
                                        ? 'bg-[#007AFF] text-white rounded-br-none' 
                                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                                    }`}>
                                        {renderMessageContent(msg, i)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Dictionary Popover */}
                {dictPopup && (
                    <div 
                        className="fixed z-50 bg-gray-900 text-white p-3 rounded-lg shadow-xl text-sm max-w-xs animate-fade-in"
                        style={{
                            top: Math.min(window.innerHeight - 150, Math.max(10, dictPopup.rect.top - 120)), 
                            left: Math.min(window.innerWidth - 250, Math.max(10, dictPopup.rect.left - 100))
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-lg capitalize mr-2">{dictPopup.word}</span>
                            <button 
                                onClick={() => playTTS(dictPopup.word, 'dict_audio')}
                                className="text-blue-300 hover:text-white"
                            >
                                🔊
                            </button>
                        </div>
                        {dictPopup.isLoading ? (
                            <div className="text-gray-400 text-xs">Loading definition...</div>
                        ) : (
                            <div className="text-gray-300 leading-snug">{dictPopup.definition}</div>
                        )}
                        <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45"></div>
                    </div>
                )}

                {/* Bottom Bar: Input */}
                <div className="absolute bottom-0 left-0 right-0 bg-[#F2F2F7]/95 backdrop-blur border-t border-gray-200 px-4 py-3 pb-8 z-40">
                    <div className="flex flex-col space-y-2">
                         <textarea
                            className="w-full h-24 p-3 bg-white rounded-xl text-gray-900 placeholder-gray-400 border border-gray-200 focus:outline-none focus:border-blue-400 transition-colors resize-none"
                            placeholder="Type your answer or ask in Chinese..."
                            value={currentInput}
                            onChange={(e) => setCurrentInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!currentInput.trim() || isGenerating}
                            className="w-full bg-[#007AFF] text-white p-3 rounded-xl shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100 font-bold text-sm"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- Other Views (Minimal Update for Style) ---

    return (
        <div className="min-h-screen bg-[#F2F2F7] font-sans antialiased">
            {view === 'home' && renderHome()}
            {view === 'answer-helper-list' && renderHelperList()}
            {view === 'answer-helper-practice' && renderPracticeView()}
            
            {view === 'writing-input' && (
                <div className="min-h-screen bg-[#F2F2F7] flex flex-col">
                     <IOSHeader title="Writing Check" onBack={() => setView('home')} />
                     
                     <div className="px-4 py-4 bg-[#F2F2F7]">
                         <div className="bg-gray-200 p-1 rounded-lg flex mb-4">
                             <button 
                                 className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${writingTask === 'task1' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                                 onClick={() => setWritingTask('task1')}
                             >
                                 Task 1 (Image)
                             </button>
                             <button 
                                 className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${writingTask === 'task2' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                                 onClick={() => setWritingTask('task2')}
                             >
                                 Task 2 (Essay)
                             </button>
                         </div>
                     </div>

                     <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                         <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                             {writingTask === 'task1' ? (
                                 <div className="space-y-4">
                                     <div 
                                         className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors relative"
                                         onClick={() => document.getElementById('imageUpload')?.click()}
                                     >
                                         {writingImagePreview ? (
                                             <img src={writingImagePreview} alt="Preview" className="max-h-48 rounded-lg object-contain" />
                                         ) : (
                                             <>
                                                 <span className="text-3xl mb-2">📷</span>
                                                 <span className="text-sm font-medium">Tap to upload chart/graph</span>
                                             </>
                                         )}
                                         <input 
                                             id="imageUpload" 
                                             type="file" 
                                             accept="image/*" 
                                             className="hidden" 
                                             onChange={handleImageUpload}
                                         />
                                     </div>
                                 </div>
                             ) : (
                                 <input 
                                    className="w-full p-3 bg-gray-50 rounded-xl font-medium border border-gray-100 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                                    placeholder="Enter Essay Topic / Question..."
                                    value={essayTopic}
                                    onChange={e => setEssayTopic(e.target.value)}
                                 />
                             )}
                             
                             <div className="relative">
                                 <textarea 
                                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:border-blue-400 focus:bg-white transition-all resize-none text-base leading-relaxed"
                                    style={{ height: writingTask === 'task1' ? '300px' : '400px' }}
                                    placeholder={writingTask === 'task1' ? "Write your report here (min 150 words)..." : "Write your essay here (min 250 words)..."}
                                    value={essayInput}
                                    onChange={e => setEssayInput(e.target.value)}
                                 />
                                 <div className="absolute bottom-3 right-3 text-xs text-gray-400 font-mono bg-white/50 px-2 rounded">
                                     {essayInput.trim().split(/\s+/).filter(Boolean).length} words
                                 </div>
                             </div>
                         </div>

                         <button 
                            onClick={handleWritingAnalyze}
                            className="w-full bg-[#007AFF] text-white py-4 rounded-xl font-bold shadow-md active:scale-95 transition-transform"
                         >
                             {writingTask === 'task1' ? 'Analyze Report' : 'Score Essay'}
                         </button>
                     </div>
                </div>
            )}
            
            {view === 'writing-results' && (
                <div className="min-h-screen bg-[#F2F2F7]">
                    <IOSHeader title="Analysis Result" onBack={() => setView('writing-input')} />
                    <div className="p-4">
                        <div className="bg-white p-6 rounded-2xl shadow-sm">
                            {renderMarkdown(writingAnalysis, () => {})}
                        </div>
                    </div>
                </div>
            )}

            {view === 'speaking-intro' && (
                <div className="min-h-screen flex flex-col bg-[#F2F2F7]">
                    <IOSHeader title="Mock Exam" onBack={() => setView('home')} />
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl shadow-sm mb-6">🎙️</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">IELTS Speaking Mock</h2>
                        <p className="text-gray-500 mb-10 leading-relaxed">
                            Simulate a full 15-minute speaking test with our AI examiner. 
                            Uses 2025 Sep-Dec topics.
                        </p>
                        <button 
                            className="w-full bg-[#007AFF] text-white py-4 rounded-xl font-bold shadow-md active:opacity-80 mb-4"
                            onClick={() => alert("Live API connection would start here.")}
                        >
                            Start Test
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const root = createRoot(document.getElementById('app')!);
root.render(<App />);