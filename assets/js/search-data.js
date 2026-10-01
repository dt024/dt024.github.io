// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-publications",
          title: "publications",
          description: "in reverse chronological order.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-cv",
          title: "CV",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "post-steering-llms-across-cultures-by-listening-to-disagreement",
        
          title: "Steering LLMs across cultures by listening to disagreement",
        
        description: "How a panel of personas built from public survey data, and the disagreement between them, can steer an LLM toward a country&#39;s moral preferences without retraining.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/disca/";
          
        },
      },{id: "post-safety-game-teaching-a-black-box-llm-when-to-say-more-and-when-to-say-less",
        
          title: "Safety Game: teaching a black-box LLM when to say more, and when to...",
        
        description: "How an idea from poker-playing AI lets us make any LLM safer at inference time, with no retraining and no access to its weights.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/safety-game/";
          
        },
      },{id: "news-a-paper-on-reducing-over-smoothing-in-graph-neural-networks-via-the-kuramoto-model-is-accepted-at-aistats-2024",
          title: 'A paper on reducing over-smoothing in graph neural networks via the Kuramoto model...',
          description: "",
          section: "News",},{id: "news-i-received-my-msc-in-computer-science-from-toyo-university",
          title: 'I received my MSc in Computer Science from Toyo University.',
          description: "",
          section: "News",},{id: "news-i-started-my-phd-in-computer-science-at-the-university-of-warwick-supervised-by-prof-long-tran-thanh",
          title: 'I started my PhD in Computer Science at the University of Warwick, supervised...',
          description: "",
          section: "News",},{id: "news-a-paper-on-inference-time-safety-alignment-of-black-box-llms-is-accepted-at-icml-2026",
          title: 'A paper on inference-time safety alignment of black-box LLMs is accepted at ICML...',
          description: "",
          section: "News",},{id: "news-a-paper-on-training-free-cultural-alignment-of-llms-via-persona-disagreement-is-accepted-at-neurips-2026",
          title: 'A paper on training-free cultural alignment of LLMs via persona disagreement is accepted...',
          description: "",
          section: "News",},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%74%75%61%6E.%6E%67%75%79%65%6E.%31@%77%61%72%77%69%63%6B.%61%63.%75%6B", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=tVVJ8I8AAAAJ", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/dt024", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/tuan-n-79400582", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
