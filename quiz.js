(function() {

  'use strict';

  // --- Category configuration ---
  var CATEGORIES = {
    foxes: {
      label: 'Fox',
      question: 'What species of fox is this?',
      imageDir: 'images/foxes/',
      dataFile: 'data/foxes.json',
      countLabel: 'species from 7 genera',
      detailPrefix: 'Genus',
      subtitleTemplate: 'Can you identify these fox species from around the world?',
      correctPhrases: ['Correct!', 'Sharp eye!', 'Nailed it!', 'Great spotting!', 'Right!', 'Exactly!', 'You know your foxes!', 'Bingo!'],
      resultSubjects: { 100: 'foxes', 80: 'fox species', 60: 'fox species', 40: 'foxes', 0: 'field guides' }
    },
    cats: {
      label: 'Cat Breed',
      question: 'What breed of cat is this?',
      imageDir: 'images/cats/',
      dataFile: 'data/cats.json',
      countLabel: 'breeds',
      detailPrefix: 'Group',
      subtitleTemplate: 'Can you identify these cat breeds?',
      correctPhrases: ['Correct!', 'Sharp eye!', 'Nailed it!', 'Purrfect!', 'Right!', 'Exactly!', 'You know your cats!', 'Bingo!'],
      resultSubjects: { 100: 'cats', 80: 'cat breeds', 60: 'cat breeds', 40: 'cats', 0: 'breed books' }
    },
    dogs: {
      label: 'Dog Breed',
      question: 'What breed of dog is this?',
      imageDir: 'images/dogs/',
      dataFile: 'data/dogs.json',
      countLabel: 'breeds',
      detailPrefix: 'Group',
      subtitleTemplate: 'Can you identify these dog breeds?',
      correctPhrases: ['Correct!', 'Sharp eye!', 'Nailed it!', 'Good boy!', 'Right!', 'Exactly!', 'You know your dogs!', 'Bingo!'],
      resultSubjects: { 100: 'dogs', 80: 'dog breeds', 60: 'dog breeds', 40: 'dogs', 0: 'breed books' }
    }
  };

  // --- DOM references ---
  var $startScreen = document.getElementById('start-screen');
  var $quizScreen = document.getElementById('quiz-screen');
  var $resultsScreen = document.getElementById('results-screen');
  var $loadingOverlay = document.getElementById('loading-overlay');
  var $startBtn = document.getElementById('start-btn');
  var $quitBtn = document.getElementById('quit-btn');
  var $playAgainBtn = document.getElementById('play-again-btn');
  var $backBtn = document.getElementById('back-btn');
  var $choices = document.getElementById('choices');
  var $feedback = document.getElementById('feedback');
  var $feedbackDetail = document.getElementById('feedback-detail');
  var $nextContainer = document.getElementById('next-container');
  var $progressText = document.getElementById('progress-text');
  var $scoreCorrect = document.getElementById('score-correct');
  var $scoreWrong = document.getElementById('score-wrong');
  var $scoreStreak = document.getElementById('score-streak');
  var $quizImage = document.getElementById('quiz-image');
  var $imgPlaceholder = document.getElementById('img-placeholder');
  var $timerFill = document.getElementById('timer-fill');
  var $resultsTitle = document.getElementById('results-title');
  var $resultsSubtitle = document.getElementById('results-subtitle');
  var $resultsPercent = document.getElementById('results-percent');
  var $resultsCorrect = document.getElementById('results-correct');
  var $resultsWrong = document.getElementById('results-wrong');
  var $resultsStreak = document.getElementById('results-streak');
  var $speciesCount = document.getElementById('species-count');
  var $subtitle = document.getElementById('subtitle');
  var $questionLabel = document.getElementById('question-label');
  var $fullTaxDesc = document.getElementById('full-tax-desc');
  var categoryCards = document.querySelectorAll('.category-card');
  var modeCards = document.querySelectorAll('.mode-card');

  // --- Data ---
  var ALL_ANIMALS = [];
  var animalsByGroup = {};
  var selectedCategory = 'foxes';
  var categoryConfig = CATEGORIES[selectedCategory];

  // --- State ---
  var quizMode = 8;
  var questions = [];
  var currentQ = 0;
  var correctCount = 0;
  var wrongCount = 0;
  var streak = 0;
  var bestStreak = 0;
  var answered = false;
  var timerInterval = null;
  var autoAdvanceTimer = null;
  var timeLeft = 0;
  var TIME_LIMIT = 15;

  // --- Helpers ---
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // Levenshtein distance for string similarity
  function levenshtein(a, b) {
    var m = a.length, n = b.length;
    var dp = [];
    for (var i = 0; i <= m; i++) {
      dp[i] = [i];
      for (var j = 1; j <= n; j++) {
        dp[i][j] = i === 0 ? j : 0;
      }
    }
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    return dp[m][n];
  }

  // Pick 3 hard distractors: prefer same-group animals, fall back to most similar names
  function pickDistractors(correct) {
    var sameGroup = (animalsByGroup[correct.group] || []).filter(function(f) { return f.name !== correct.name; });
    sameGroup = shuffle(sameGroup);

    if (sameGroup.length >= 3) return sameGroup.slice(0, 3);

    // Need more: find most similar names from other groups
    var needed = 3 - sameGroup.length;
    var used = {};
    used[correct.name] = true;
    sameGroup.forEach(function(f) { used[f.name] = true; });

    var others = ALL_ANIMALS.filter(function(f) { return !used[f.name]; });
    others.sort(function(a, b) {
      return levenshtein(a.name, correct.name) - levenshtein(b.name, correct.name);
    });

    return sameGroup.concat(others.slice(0, needed));
  }

  function showScreen(name) {
    $startScreen.style.display = name === 'start' ? 'flex' : 'none';
    $quizScreen.style.display = name === 'quiz' ? 'block' : 'none';
    $resultsScreen.style.display = name === 'results' ? 'block' : 'none';
  }

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // --- Update start screen for selected category ---
  function updateStartScreen() {
    categoryConfig = CATEGORIES[selectedCategory];
    $subtitle.textContent = categoryConfig.subtitleTemplate;
    $speciesCount.textContent = ALL_ANIMALS.length + ' ' + categoryConfig.countLabel;
    $fullTaxDesc.textContent = 'All ' + ALL_ANIMALS.length + ' ' + (selectedCategory === 'foxes' ? 'species' : 'breeds');
  }

  // --- Initialization ---
  function init() {
    updateStartScreen();
    $loadingOverlay.classList.add('hidden');
  }

  // Cards use role="button" tabindex="0" rather than <button> (they hold
  // block-level icon/name/count children), so Enter/Space have to be wired
  // up by hand to match native button behaviour. stopPropagation() is load-
  // bearing: the document-level keydown listener below treats any
  // unconsumed Enter on the start screen as "start the quiz", so without it
  // pressing Enter to select a card also immediately starts the quiz.
  function makeKeyboardActivatable(el) {
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        e.stopPropagation();
        el.click();
      }
    });
  }

  // --- Category selection ---
  categoryCards.forEach(function(card) {
    makeKeyboardActivatable(card);
    card.addEventListener('click', function() {
      var cat = card.dataset.category;
      if (cat === selectedCategory) return;

      categoryCards.forEach(function(c) { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
      selectedCategory = cat;

      loadCategoryData(function() {
        updateStartScreen();
      });
    });
  });

  // --- Mode selection ---
  modeCards.forEach(function(card) {
    makeKeyboardActivatable(card);
    card.addEventListener('click', function() {
      modeCards.forEach(function(c) { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
      quizMode = parseInt(card.dataset.mode);
    });
  });

  // --- Quiz logic ---
  function startQuiz() {
    if (ALL_ANIMALS.length === 0) return;
    categoryConfig = CATEGORIES[selectedCategory];

    var count = quizMode === 0 ? ALL_ANIMALS.length : quizMode;
    var pool = shuffle(ALL_ANIMALS).slice(0, count);

    questions = pool.map(function(animal) {
      var wrongs = pickDistractors(animal);
      var choices = shuffle([animal].concat(wrongs));
      return { animal: animal, choices: choices, correctIdx: choices.indexOf(animal) };
    });

    currentQ = 0;
    correctCount = 0;
    wrongCount = 0;
    streak = 0;
    bestStreak = 0;
    answered = false;

    showScreen('quiz');
    $questionLabel.textContent = categoryConfig.question;
    loadQuestion();
  }

  function loadQuestion() {
    answered = false;
    var q = questions[currentQ];

    $progressText.textContent = (currentQ + 1) + ' / ' + questions.length;
    $scoreCorrect.textContent = correctCount;
    $scoreWrong.textContent = wrongCount;
    $scoreStreak.textContent = '\uD83D\uDD25 ' + streak;

    // Load image
    $quizImage.className = 'loading';
    $imgPlaceholder.style.display = 'flex';
    $imgPlaceholder.textContent = 'Loading...';

    $quizImage.onload = function() {
      $quizImage.className = '';
      $imgPlaceholder.style.display = 'none';
    };
    $quizImage.onerror = function() {
      $imgPlaceholder.textContent = 'Image failed to load';
    };
    $quizImage.src = categoryConfig.imageDir + encodeURIComponent(q.animal.file);

    // Build choices
    clearChildren($choices);
    var letters = ['1', '2', '3', '4'];
    q.choices.forEach(function(c, i) {
      var btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.dataset.idx = i;

      var letterSpan = document.createElement('span');
      letterSpan.className = 'choice-letter';
      letterSpan.textContent = letters[i];

      btn.appendChild(letterSpan);
      btn.appendChild(document.createTextNode(c.name));
      btn.addEventListener('click', function() { answer(i); });
      $choices.appendChild(btn);
    });

    // Clear feedback and next button
    $feedback.textContent = '';
    $feedback.className = 'feedback';
    $feedbackDetail.textContent = '';
    clearChildren($nextContainer);

    startTimer();
  }

  function startTimer() {
    timeLeft = TIME_LIMIT;
    $timerFill.style.width = '100%';

    clearInterval(timerInterval);
    timerInterval = setInterval(function() {
      timeLeft -= 0.1;
      var pct = Math.max(0, (timeLeft / TIME_LIMIT) * 100);
      $timerFill.style.width = pct + '%';

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if (!answered) timeUp();
      }
    }, 100);
  }

  function getFeedbackDetail(animal) {
    if (selectedCategory === 'foxes') {
      return animal.scientific + ' \u2014 Genus ' + animal.group;
    }
    return categoryConfig.detailPrefix + ': ' + animal.group;
  }

  function timeUp() {
    answered = true;
    wrongCount++;
    streak = 0;
    var q = questions[currentQ];

    var btns = $choices.querySelectorAll('.choice-btn');
    btns.forEach(function(btn, i) {
      btn.classList.add('disabled');
      if (i === q.correctIdx) btn.classList.add('correct-answer');
    });

    $feedback.textContent = 'Time\u2019s up! It was the ' + q.animal.name;
    $feedback.className = 'feedback wrong-fb';
    $feedbackDetail.textContent = getFeedbackDetail(q.animal);
    updateScoreDisplay();
    showNextButton();
  }

  function answer(idx) {
    if (answered) return;
    answered = true;
    clearInterval(timerInterval);

    var q = questions[currentQ];
    var isCorrect = idx === q.correctIdx;

    var btns = $choices.querySelectorAll('.choice-btn');
    btns.forEach(function(btn, i) {
      btn.classList.add('disabled');
      if (i === q.correctIdx) btn.classList.add('correct-answer');
      if (i === idx && !isCorrect) btn.classList.add('wrong-answer');
    });

    if (isCorrect) {
      correctCount++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      $feedback.textContent = getCorrectPhrase();
      $feedback.className = 'feedback correct-fb';
    } else {
      wrongCount++;
      streak = 0;
      $feedback.textContent = 'Nope! It\u2019s the ' + q.animal.name;
      $feedback.className = 'feedback wrong-fb';
    }

    $feedbackDetail.textContent = getFeedbackDetail(q.animal);
    updateScoreDisplay();
    showNextButton();
  }

  function getCorrectPhrase() {
    var phrases = categoryConfig.correctPhrases;
    if (streak >= 5) return '\uD83D\uDD25 ' + streak + ' in a row!';
    if (streak >= 3) return 'On fire! ' + phrases[Math.floor(Math.random() * phrases.length)];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  function updateScoreDisplay() {
    $scoreCorrect.textContent = correctCount;
    $scoreWrong.textContent = wrongCount;
    $scoreStreak.textContent = '\uD83D\uDD25 ' + streak;
  }

  function showNextButton() {
    clearChildren($nextContainer);
    var isLast = currentQ >= questions.length - 1;
    var btn = document.createElement('button');
    btn.className = 'next-btn';
    btn.textContent = isLast ? 'See Results' : 'Next';
    btn.addEventListener('click', nextQuestion);
    $nextContainer.appendChild(btn);
    autoAdvanceTimer = setTimeout(nextQuestion, 1000);
  }

  function nextQuestion() {
    clearTimeout(autoAdvanceTimer);
    currentQ++;
    if (currentQ >= questions.length) {
      showResults();
    } else {
      loadQuestion();
    }
  }

  function showResults() {
    clearInterval(timerInterval);
    showScreen('results');
    var total = questions.length;
    var pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    $resultsPercent.textContent = pct + '%';
    $resultsCorrect.textContent = correctCount;
    $resultsWrong.textContent = wrongCount;
    $resultsStreak.textContent = bestStreak;

    var title, subtitle;
    if (pct === 100) { title = 'Master Naturalist'; subtitle = 'Flawless! You can identify every one.'; }
    else if (pct >= 80) { title = 'Wildlife Expert'; subtitle = 'Impressive identification skills.'; }
    else if (pct >= 60) { title = 'Field Researcher'; subtitle = 'A solid knowledge base.'; }
    else if (pct >= 40) { title = 'Nature Enthusiast'; subtitle = 'Keep studying \u2014 you\u2019re getting there.'; }
    else { title = 'Beginner Spotter'; subtitle = 'Time to hit the reference books!'; }

    $resultsTitle.textContent = title;
    $resultsSubtitle.textContent = subtitle;
  }

  function quitQuiz() {
    clearInterval(timerInterval);
    if (correctCount + wrongCount > 0) {
      showResults();
    } else {
      showScreen('start');
    }
  }

  // --- Event listeners ---
  $startBtn.addEventListener('click', startQuiz);
  $quitBtn.addEventListener('click', quitQuiz);
  $playAgainBtn.addEventListener('click', startQuiz);
  $backBtn.addEventListener('click', function() { showScreen('start'); });

  // Keyboard support
  document.addEventListener('keydown', function(e) {
    var quizVisible = $quizScreen.style.display === 'block';
    if (!quizVisible) {
      if (e.key === 'Enter') startQuiz();
      return;
    }

    if (!answered) {
      if (e.key >= '1' && e.key <= '4') {
        answer(parseInt(e.key) - 1);
      }
    } else {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        nextQuestion();
      }
    }
  });

  // --- Load JSON (works with both http:// and file:// protocols) ---
  function loadJSON(url, callback) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 0) {
          callback(JSON.parse(xhr.responseText));
        }
      };
      xhr.send();
    } catch (e) {
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(callback);
    }
  }

  // --- Load category data ---
  function loadCategoryData(callback) {
    var config = CATEGORIES[selectedCategory];
    loadJSON(config.dataFile, function(data) {
      ALL_ANIMALS = data;
      animalsByGroup = {};
      ALL_ANIMALS.forEach(function(a) {
        if (!animalsByGroup[a.group]) animalsByGroup[a.group] = [];
        animalsByGroup[a.group].push(a);
      });
      if (callback) callback();
    });
  }

  // --- Update category card counts from actual data ---
  function updateCategoryCount(cat) {
    var el = document.getElementById('cat-count-' + cat);
    if (!el) return;
    var config = CATEGORIES[cat];
    loadJSON(config.dataFile, function(data) {
      var unit = cat === 'foxes' ? 'species' : 'breeds';
      el.textContent = data.length + ' ' + unit;
    });
  }

  // --- Boot ---
  loadCategoryData(function() {
    init();
    // Update all category card counts from actual JSON data
    updateCategoryCount('foxes');
    updateCategoryCount('cats');
    updateCategoryCount('dogs');
  });
})();
