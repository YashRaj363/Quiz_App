        const startScreen = document.getElementById('start-screen');
        const quizScreen = document.getElementById('quiz-screen');
        const resultScreen = document.getElementById('result-screen');

        const startBtn = document.getElementById('start-btn');
        const nextBtn = document.getElementById('next-btn');
        const restartBtn = document.getElementById('restart-btn');
        
        const loadingText = document.getElementById('loading-text');
        const questionsAmountSelect = document.getElementById('questions-amount');
        const difficultyLevelSelect = document.getElementById('difficulty-level');
        const quizCategorySelect = document.getElementById('quiz-category');
        const timerDurationSelect = document.getElementById('timer-duration');

        const questionCounter = document.getElementById('question-counter');
        const timerDisplay = document.getElementById('timer');
        const timerBarProgress = document.getElementById('timer-bar-progress');
        const questionText = document.getElementById('question-text');
        const optionsContainer = document.getElementById('options-container');
        const feedback = document.getElementById('feedback');
        
        const finalScoreDisplay = document.getElementById('final-score');
        const scoreMessage = document.getElementById('score-message');

        let questions = [];
        let sessionToken = '';
        let currentQuestionIndex = 0;
        let score = 0;
        let timer;
        let timeLeft = 30;
        let totalQuestions = 10;
        let timePerQuestion = 30;

        async function fetchSessionToken() {
            try {
                const response = await fetch('https://opentdb.com/api_token.php?command=request');
                if (!response.ok) throw new Error('Token network response was not ok');
                const data = await response.json();
                if (data.response_code === 0) {
                    sessionToken = data.token;
                } else {
                    console.error('Failed to retrieve session token.');
                }
            } catch (error) {
                console.error('Error fetching session token:', error);
            }
        }

        async function fetchQuestions() {
            totalQuestions = questionsAmountSelect.value;
            const difficulty = difficultyLevelSelect.value;
            const category = quizCategorySelect.value;
            timePerQuestion = parseInt(timerDurationSelect.value);

            let apiUrl = `https://opentdb.com/api.php?amount=${totalQuestions}&type=multiple`;
            if (difficulty) apiUrl += `&difficulty=${difficulty}`;
            if (category) apiUrl += `&category=${category}`;
            if (sessionToken) apiUrl += `&token=${sessionToken}`;

            loadingText.textContent = 'Loading questions...';
            startBtn.disabled = true;

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                
                if (data.response_code === 3 || data.response_code === 4) {
                    console.warn(`Token invalid (code ${data.response_code}). Fetching a new one and retrying.`);
                    await fetchSessionToken(); 
                    fetchQuestions(); 
                    return;
                }

                if (data.response_code !== 0) {
                    throw new Error('Could not fetch enough questions for the selected criteria. Please try different options.');
                }

                questions = data.results.map(question => {
                    const allAnswers = [...question.incorrect_answers, question.correct_answer];
                    for (let i = allAnswers.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]];
                    }
                    return {
                        question: question.question,
                        options: allAnswers,
                        correctAnswer: question.correct_answer
                    };
                });
                startQuiz();
            } catch (error) {
                console.error("Failed to fetch questions:", error);
                loadingText.textContent = error.message;
            } finally {
                startBtn.disabled = false;
            }
        }
        
        function startQuiz() {
            currentQuestionIndex = 0;
            score = 0;
            loadingText.textContent = '';
            startScreen.classList.add('hidden');
            resultScreen.classList.add('hidden');
            quizScreen.classList.remove('hidden');
            nextBtn.classList.add('hidden');
            displayQuestion();
        }

        function displayQuestion() {
            resetState();
            if (currentQuestionIndex < questions.length) {
                const currentQuestion = questions[currentQuestionIndex];
                questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${totalQuestions}`;
                questionText.innerHTML = currentQuestion.question; 
                
                currentQuestion.options.forEach(option => {
                    const button = document.createElement('button');
                    button.innerHTML = option;
                    button.classList.add('answer-btn');
                    button.addEventListener('click', () => selectAnswer(button, currentQuestion.correctAnswer));
                    optionsContainer.appendChild(button);
                });
                
                document.getElementById('question-area').classList.remove('question-fade-in');
                void document.getElementById('question-area').offsetWidth; 
                document.getElementById('question-area').classList.add('question-fade-in');

                startTimer();
            } else {
                showResults();
            }
        }

        function startTimer() {
            timeLeft = timePerQuestion;
            timerDisplay.textContent = timeLeft;
            timerBarProgress.style.width = '100%';
            timerBarProgress.classList.remove('bg-red-500', 'bg-yellow-500');
            timerBarProgress.classList.add('bg-indigo-500');
            
            timer = setInterval(() => {
                timeLeft--;
                timerDisplay.textContent = timeLeft;
                timerBarProgress.style.width = `${(timeLeft / timePerQuestion) * 100}%`;

                if(timeLeft < (timePerQuestion * 0.33)) timerBarProgress.classList.add('bg-red-500');
                else if (timeLeft < (timePerQuestion * 0.66)) timerBarProgress.classList.add('bg-yellow-500');

                if (timeLeft <= 0) {
                    clearInterval(timer);
                    handleTimeout();
                }
            }, 1000);
        }
        
        function handleTimeout() {
            feedback.textContent = "❌ Time's up!";
            feedback.classList.add('text-red-500');
            
            const correctAnswer = questions[currentQuestionIndex].correctAnswer;
            Array.from(optionsContainer.children).forEach(button => {
                if (button.innerHTML === correctAnswer) {
                    button.classList.add('correct');
                }
                button.disabled = true;
            });
            nextBtn.classList.remove('hidden');
        }

        function resetState() {
            clearInterval(timer);
            optionsContainer.innerHTML = '';
            feedback.textContent = '';
            feedback.classList.remove('text-green-500', 'text-red-500');
            nextBtn.classList.add('hidden');
        }

        function selectAnswer(selectedButton, correctAnswer) {
            clearInterval(timer);
            const isCorrect = selectedButton.innerHTML === correctAnswer;

            if (isCorrect) {
                score++;
                selectedButton.classList.add('correct');
                feedback.textContent = '✅ Correct Answer!';
                feedback.classList.add('text-green-500');
            } else {
                selectedButton.classList.add('incorrect');
                feedback.textContent = '❌ Wrong Answer!';
                feedback.classList.add('text-red-500');
                
                Array.from(optionsContainer.children).forEach(button => {
                    if (button.innerHTML === correctAnswer) {
                        button.classList.add('correct');
                    }
                });
            }

            Array.from(optionsContainer.children).forEach(button => {
                button.disabled = true;
            });

            nextBtn.classList.remove('hidden');
        }

        function showResults() {
            quizScreen.classList.add('hidden');
            resultScreen.classList.remove('hidden');
            finalScoreDisplay.textContent = score;
            document.querySelector('#score-circle .text-slate-500').textContent = `out of ${totalQuestions}`;
            
            let message = '';
            const percentage = (score / totalQuestions) * 100;
            if (percentage === 100) {
                message = "Perfect! You're a quiz master! 🏆";
            } else if (percentage >= 70) {
                message = "Great job! You really know your stuff. ✨";
            } else if (percentage >= 50) {
                message = "Good effort! Keep practicing. 👍";
            } else {
                message = "Keep trying! Every quiz is a learning opportunity. 🧠";
            }
            scoreMessage.textContent = message;
        }

        startBtn.addEventListener('click', fetchQuestions);
        nextBtn.addEventListener('click', () => {
            currentQuestionIndex++;
            displayQuestion();
        });
        restartBtn.addEventListener('click', () => {
            resultScreen.classList.add('hidden');
            startScreen.classList.remove('hidden');
        });

        window.onload = fetchSessionToken;
