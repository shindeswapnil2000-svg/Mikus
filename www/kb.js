/* Built-in knowledge for Scholar, Path and Body. Everything here is a starting point written from general knowledge:
   rules, deadlines and affiliations change, so every entry carries a link or a search to verify it. */
(function (root) {
  "use strict";

  // ---------------------------------------------------------------- live feeds (Scholar > Pulse)
  const FEEDS = [
    { id: "hindu", n: "The Hindu · National", c: "india", u: "https://www.thehindu.com/news/national/feeder/default.rss" },
    { id: "scroll", n: "Scroll.in", c: "india", u: "https://feeds.feedburner.com/ScrollinArticles.rss" },
    { id: "wire", n: "The Wire", c: "india", u: "https://thewire.in/rss" },
    { id: "print", n: "ThePrint", c: "india", u: "https://theprint.in/feed/" },
    { id: "ie", n: "Indian Express · India", c: "india", u: "https://indianexpress.com/section/india/feed/" },
    { id: "bbcin", n: "BBC · India", c: "india", u: "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml" },
    { id: "maktoob", n: "Maktoob Media", c: "india", u: "https://maktoobmedia.com/feed/" },
    { id: "aj", n: "Al Jazeera", c: "world", u: "https://www.aljazeera.com/xml/rss/all.xml" },
    { id: "guardian", n: "The Guardian · World", c: "world", u: "https://www.theguardian.com/world/rss" },
    { id: "bbcw", n: "BBC · World", c: "world", u: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { id: "conv", n: "The Conversation", c: "social", u: "https://theconversation.com/global/articles.atom" },
    { id: "sss", n: "Social Science Space", c: "social", u: "https://www.socialsciencespace.com/feed/" },
    { id: "lse", n: "LSE South Asia", c: "social", u: "https://blogs.lse.ac.uk/southasia/feed/" },
    { id: "aeon", n: "Aeon", c: "social", u: "https://aeon.co/feed.rss" },
    { id: "boston", n: "Boston Review", c: "social", u: "https://www.bostonreview.net/feed/" },
    { id: "pew", n: "Pew · Religion", c: "social", u: "https://www.pewresearch.org/religion/feed/" },
    { id: "allegra", n: "Allegra Lab", c: "anthro", u: "https://allegralaboratory.net/feed/" },
    { id: "sapiens", n: "SAPIENS", c: "anthro", u: "https://www.sapiens.org/feed/" },
    { id: "savage", n: "Savage Minds", c: "anthro", u: "https://savageminds.org/feed/" },
    { id: "anews", n: "Anthropology News", c: "anthro", u: "https://www.anthropology-news.org/feed/" },
    { id: "organiser", n: "Organiser (RSS weekly)", c: "primary", u: "https://organiser.org/feed/" }
  ];
  const FEED_CATS = [["all", "All"], ["india", "India"], ["world", "World"], ["social", "Social science"], ["anthro", "Anthropology"], ["primary", "Primary source"]];

  // Words that mark an item as "on your topic".
  const FOCUS = ["hindutva", "hindu nationalis", "communal", "minorit", "hate speech", "hate crime", "lynch", "bulldoz", "majoritarian", "populis", "religious freedom", "religious extrem", "radicalis", "radicaliz", "anti-conversion", "love jihad", "citizenship", "caste", "islamophobi", "polarisation", "polarization", "riot", "pogrom", "genocide", "ethnic", "identity", "nationalis", "secular", "kinship", "friendship", "youth", "ethnograph", "anthropolog", "sociolog", "waqf", "uniform civil code", "religious conversion", "dog whistle", "disinformation", "online hate"];

  // ---------------------------------------------------------------- canon (Scholar > Canon)
  // [id, author, title, year, tags, why it matters to this project]
  const T = {
    hate: "Hate & violence", nat: "Nationalism", pop: "Populism", rel: "Religion & secular", kin: "Kinship & friendship", youth: "Youth & culture",
    caste: "Caste & class", india: "India", meth: "Method", prim: "Primary texts", classic: "Classic theory", emo: "Emotion & affect", state: "State & power"
  };
  const CANON = [
    ["durk", "Émile Durkheim", "The Elementary Forms of Religious Life", 1912, ["classic", "rel"], "Religion as collective effervescence: how groups make the sacred, and by extension the profane they exclude."],
    ["weber", "Max Weber", "Economy and Society", 1922, ["classic", "state", "rel"], "Charisma, legitimacy and the state's monopoly on violence. Essential for reading populist leadership."],
    ["marxj", "Karl Marx", "On the Jewish Question", 1844, ["classic", "rel", "state"], "An early argument about religion, emancipation and minority status in a secular state."],
    ["gram", "Antonio Gramsci", "Selections from the Prison Notebooks", 1971, ["classic", "state"], "Hegemony and common sense: how a worldview becomes ordinary. Core to how Hindutva moves from the margins to the mainstream."],
    ["fouc1", "Michel Foucault", "Society Must Be Defended (lectures 1975-76)", 1997, ["classic", "state", "hate"], "Race-war, biopolitics and the idea that society defends itself against its internal enemies."],
    ["said", "Edward Said", "Orientalism", 1978, ["classic", "rel", "india"], "How knowledge about 'the other' is produced. Pair with its critiques in South Asia."],
    ["bourd", "Pierre Bourdieu", "Outline of a Theory of Practice", 1977, ["classic", "meth"], "Habitus, field and symbolic violence. Useful for explaining why hate feels natural to those who carry it."],
    ["schmitt", "Carl Schmitt", "The Concept of the Political", 1932, ["classic", "hate", "state"], "The friend/enemy distinction as the core of politics. Controversial author, but you will meet this argument constantly."],
    ["arendt", "Hannah Arendt", "The Origins of Totalitarianism", 1951, ["classic", "hate", "state"], "Statelessness, mass movements, and the loss of the 'right to have rights'."],
    ["girard", "René Girard", "The Scapegoat", 1982, ["classic", "hate"], "Mimetic desire and sacrificial violence: why communities pick a victim."],
    ["douglas", "Mary Douglas", "Purity and Danger", 1966, ["classic", "hate", "rel"], "Pollution beliefs and boundary-making. A key anthropological lens on disgust and exclusion."],
    ["allport", "Gordon Allport", "The Nature of Prejudice", 1954, ["classic", "hate"], "The psychology classic on prejudice and the contact hypothesis."],
    ["tajfel", "Henri Tajfel and John Turner", "An Integrative Theory of Intergroup Conflict", 1979, ["classic", "hate"], "Social identity theory: in-group favouritism needs very little to start."],
    ["barth", "Fredrik Barth (ed.)", "Ethnic Groups and Boundaries", 1969, ["classic", "nat"], "Ethnicity lives at the boundary, not in cultural content. Foundational."],
    ["anderson", "Benedict Anderson", "Imagined Communities", 1983, ["classic", "nat"], "The nation as an imagined community built through print and shared time."],
    ["gellner", "Ernest Gellner", "Nations and Nationalism", 1983, ["classic", "nat"], "Nationalism as a product of industrial modernity."],
    ["hobs", "Eric Hobsbawm and Terence Ranger (eds.)", "The Invention of Tradition", 1983, ["classic", "nat"], "How 'ancient' traditions are made recently. Directly relevant to Hindutva's use of history."],
    ["geertz", "Clifford Geertz", "The Interpretation of Cultures", 1973, ["classic", "meth"], "Thick description. The reference point for ethnographic method and its critics."],
    ["cohen", "Stanley Cohen", "Folk Devils and Moral Panics", 1972, ["classic", "hate"], "How societies manufacture panics around marginal groups."],
    ["herz", "Michael Herzfeld", "The Social Production of Indifference", 1992, ["classic", "state", "hate"], "Bureaucratic indifference as a form of exclusion. A neglected anthropological gem."],
    ["appa", "Arjun Appadurai", "Fear of Small Numbers", 2006, ["hate", "nat", "india"], "Why majorities fear minorities in an age of globalisation. Probably the single most on-topic book on your list."],
    ["ahmed", "Sara Ahmed", "The Cultural Politics of Emotion", 2004, ["emo", "hate"], "Hate as something that circulates and sticks to bodies. 'Affective economies' is a core concept for an anthropology of hatred."],
    ["butler", "Judith Butler", "Frames of War", 2009, ["hate", "state"], "Whose lives count as grievable? Precarity and recognition."],
    ["mamdani1", "Mahmood Mamdani", "Good Muslim, Bad Muslim", 2004, ["rel", "hate", "state"], "How the 'good/bad Muslim' binary works in politics."],
    ["mamdani2", "Mahmood Mamdani", "When Victims Become Killers", 2001, ["hate", "state"], "Colonial categories and the making of genocidal identities (Rwanda)."],
    ["asad", "Talal Asad", "Formations of the Secular", 2003, ["rel", "state"], "Secularism as a political doctrine, not a neutral absence. Vital for the Indian secularism debate."],
    ["mahmood", "Saba Mahmood", "Religious Difference in a Secular Age", 2016, ["rel", "state"], "How the secular state manages and produces minority status."],
    ["laclau", "Ernesto Laclau", "On Populist Reason", 2005, ["pop"], "Populism as a political logic: 'the people' constructed against an enemy."],
    ["muller", "Jan-Werner Müller", "What Is Populism?", 2016, ["pop"], "Populism as anti-pluralism. A sharp, short definition to argue with."],
    ["mudde", "Cas Mudde and Cristóbal Rovira Kaltwasser", "Populism: A Very Short Introduction", 2017, ["pop"], "The 'ideational' approach: thin-centred ideology, pure people vs corrupt elite."],
    ["stanley", "Jason Stanley", "How Fascism Works", 2018, ["pop", "hate"], "Accessible mapping of fascist politics tactics. Read it critically."],
    ["brubaker", "Rogers Brubaker", "Ethnicity without Groups", 2004, ["nat", "meth"], "Stop treating ethnic groups as things. Study categorisation and 'groupness' as events."],
    ["sahlins", "Marshall Sahlins", "What Kinship Is and Is Not", 2013, ["kin"], "Kinship as 'mutuality of being'. The anchor for your kinship interest."],
    ["carsten", "Janet Carsten", "After Kinship", 2004, ["kin"], "Relatedness beyond blood and marriage."],
    ["schneider", "David Schneider", "American Kinship", 1968, ["kin", "classic"], "The cultural account that cracked open the study of kinship."],
    ["bellcol", "Sandra Bell and Simon Coleman (eds.)", "The Anthropology of Friendship", 1999, ["kin"], "The standard collection on friendship across societies."],
    ["desai", "Amit Desai and Evan Killick (eds.)", "The Ways of Friendship", 2010, ["kin"], "Friendship as a social form, with good ethnographic cases."],
    ["tambiah", "Stanley Tambiah", "Leveling Crowds", 1996, ["hate", "india", "state"], "Ethnonationalist riots in South Asia, with an anthropologist's eye for ritual and crowd."],
    ["brass", "Paul Brass", "The Production of Hindu-Muslim Violence in Contemporary India", 2003, ["hate", "india", "state"], "Riots are produced by 'institutionalised riot systems', not spontaneous. Mandatory."],
    ["varshney", "Ashutosh Varshney", "Ethnic Conflict and Civic Life", 2002, ["hate", "india", "kin"], "Everyday inter-communal engagement as a barrier to riots. A counterpoint to Brass."],
    ["das1", "Veena Das (ed.)", "Mirrors of Violence", 1990, ["hate", "india"], "Anthropological essays on communal violence in India."],
    ["das2", "Veena Das", "Life and Words", 2007, ["hate", "india", "meth"], "Violence and the descent into the ordinary. A model of ethnographic writing."],
    ["pandey", "Gyanendra Pandey", "The Construction of Communalism in Colonial North India", 1990, ["india", "hate", "nat"], "How 'communal' identity was made in the colonial period."],
    ["nandy", "Ashis Nandy", "The Intimate Enemy", 1983, ["india", "state"], "Colonialism's psychological damage, and an alternative reading of Indian tradition."],
    ["hansen", "Thomas Blom Hansen", "The Saffron Wave", 1999, ["india", "nat", "pop"], "Democracy and Hindu nationalism in modern India. The anthropological standard."],
    ["jaffrelot", "Christophe Jaffrelot", "The Hindu Nationalist Movement and Indian Politics", 1996, ["india", "nat"], "The movement's organisational and ideological history."],
    ["jaffrelot2", "Christophe Jaffrelot", "Modi's India: Hindu Nationalism and the Rise of Ethnic Democracy", 2021, ["india", "nat", "pop"], "The argument that India is becoming an 'ethnic democracy'. Debated, so read the critiques too."],
    ["tsarkar", "Tanika Sarkar", "Hindu Wife, Hindu Nation", 2001, ["india", "nat", "kin"], "Gender, family and community in Hindu nationalism."],
    ["khaki", "Tapan Basu, Pradip Datta, Sumit Sarkar, Tanika Sarkar and Sambuddha Sen", "Khaki Shorts and Saffron Flags", 1993, ["india", "nat"], "A short, influential critique of the RSS. Useful on the organisation's grassroots."],
    ["chatterji", "Angana Chatterji", "Violent Gods: Hindu Nationalism in India's Present", 2009, ["india", "hate", "meth"], "Ethnography of Hindu nationalism in Odisha."],
    ["bhatt", "Chetan Bhatt", "Hindu Nationalism: Origins, Ideologies and Modern Myths", 2001, ["india", "nat"], "Intellectual history of the ideology."],
    ["sharma", "Jyotirmaya Sharma", "Hindutva: Exploring the Idea of Hindu Nationalism", 2003, ["india", "nat", "prim"], "Close reading of Hindutva's thinkers."],
    ["menon", "Kalyani Devaki Menon", "Everyday Nationalism: Women of the Hindu Right in India", 2010, ["india", "nat", "meth"], "Ethnography of women in Hindu-right organisations. A model for your method."],
    ["berenschot", "Ward Berenschot", "Riot Politics: Hindu-Muslim Violence and the Indian State", 2011, ["india", "hate", "state"], "How local politics and patronage shape riots in Gujarat."],
    ["kesavan", "Mukul Kesavan", "Secular Common Sense", 2001, ["india", "rel"], "A readable defence of Indian secularism by a historian."],
    ["hilal", "Hilal Ahmed", "Muslim Political Discourse in Postcolonial India", 2014, ["india", "rel"], "Muslim political thought as it is actually expressed."],
    ["chatterjee", "Partha Chatterjee", "The Nation and Its Fragments", 1993, ["india", "nat", "classic"], "The 'inner/outer' domain argument about anticolonial nationalism."],
    ["jeffrey", "Craig Jeffrey", "Timepass: Youth, Class, and the Politics of Waiting in India", 2010, ["youth", "india", "meth"], "Ethnography of unemployed educated young men and their politics."],
    ["dumont", "Louis Dumont", "Homo Hierarchicus", 1966, ["caste", "india", "classic"], "The classic structuralist account of caste, much criticised. Know it to argue with it."],
    ["srinivas", "M. N. Srinivas", "Religion and Society among the Coorgs of South India", 1952, ["caste", "india", "classic"], "Where 'Sanskritisation' comes from."],
    ["ambedkar", "B. R. Ambedkar", "Annihilation of Caste", 1936, ["caste", "india", "prim"], "The radical critique of caste and Hindu orthodoxy. Primary text."],
    ["savarkar", "V. D. Savarkar", "Essentials of Hindutva (Hindutva: Who Is a Hindu?)", 1923, ["prim", "india", "nat"], "The founding text of the ideology. Read it as a primary source."],
    ["golwalkar", "M. S. Golwalkar", "We, or Our Nationhood Defined", 1939, ["prim", "india", "nat"], "Early RSS ideology. Primary source; note how the movement later treated it."],
    ["hinton", "Alexander Laban Hinton", "Why Did They Kill? Cambodia in the Shadow of Genocide", 2005, ["hate", "meth"], "Anthropology of genocide: ideology, honour, and perpetration."],
    ["hinton2", "Alexander Laban Hinton (ed.)", "Annihilating Difference: The Anthropology of Genocide", 2002, ["hate"], "The core collection on the anthropology of genocide."],
    ["spencer", "Jonathan Spencer", "Anthropology, Politics, and the State", 2007, ["state", "meth", "india"], "Democracy and ethnographic study of politics in South Asia."],
    ["udupa", "Sahana Udupa, Iginio Gagliardone and Peter Hervik (eds.)", "Digital Hate: The Global Conjuncture of Online Hate Speech", 2021, ["hate", "india", "youth"], "The current reference on online hate, with India well represented."],
    ["gupta", "Akhil Gupta and James Ferguson (eds.)", "Anthropological Locations", 1997, ["meth", "classic"], "Rethinking 'the field' in anthropology."],
    ["writing", "James Clifford and George Marcus (eds.)", "Writing Culture", 1986, ["meth", "classic"], "The reflexive turn. Know the debate."],
    ["emerson", "Robert Emerson, Rachel Fretz and Linda Shaw", "Writing Ethnographic Fieldnotes", 1995, ["meth"], "Practical: how to actually take fieldnotes."],
    ["malin", "Bronisław Malinowski", "Argonauts of the Western Pacific", 1922, ["meth", "classic"], "The origin story of participant observation."],
    ["evans", "E. E. Evans-Pritchard", "Witchcraft, Oracles and Magic among the Azande", 1937, ["meth", "classic", "rel"], "Beliefs as rational within their own system. Useful for studying 'irrational' hatred."]
  ];

  // ---------------------------------------------------------------- funding (Path > Funding)
  // lv: phd | postdoc | faculty. where: country codes. All entries need verifying on the official page.
  const FUND = [
    { id: "gates", n: "Gates Cambridge Scholarship", lv: "phd", w: ["UK"], cov: "Full cost: fees, stipend, travel, family allowance", who: "International (non-UK) applicants to Cambridge, any field", win: "Usually applied for through the Cambridge application, with early-winter deadlines", u: "https://www.gatescambridge.org" },
    { id: "clarendon", n: "Clarendon Scholarships (Oxford)", lv: "phd", w: ["UK"], cov: "Fees plus living costs", who: "Considered automatically for strong DPhil applicants to Oxford who apply by the main deadline", win: "Oxford main deadlines are in January", u: "https://www.ox.ac.uk/clarendon" },
    { id: "csc", n: "Commonwealth PhD Scholarships (CSC)", lv: "phd", w: ["UK"], cov: "Fees, stipend, airfare", who: "Citizens of eligible Commonwealth countries (applications usually route through a national nominating body)", win: "Autumn, for the following year. Check the CSC site", u: "https://cscuk.fcdo.gov.uk" },
    { id: "rhodes", n: "Rhodes Scholarship", lv: "phd", w: ["UK"], cov: "Full funding at Oxford", who: "Each country has its own constituency. India has one", win: "Usually mid to late year", u: "https://www.rhodeshouse.ox.ac.uk" },
    { id: "felix", n: "Felix Scholarships", lv: "phd", w: ["UK"], cov: "Fees and living costs at Oxford, SOAS or Reading", who: "Indian graduates admitted to those universities", win: "Check the foundation site", u: "https://www.felixscholarship.org" },
    { id: "inlaks", n: "Inlaks Shivdasani Foundation Scholarships", lv: "phd", w: ["UK", "US", "EU"], cov: "Grants for study at leading universities abroad", who: "Indian nationals", win: "Check the foundation site", u: "https://www.inlaksfoundation.org" },
    { id: "tata", n: "JN Tata Endowment", lv: "phd", w: ["any"], cov: "Partial grant or loan scholarship", who: "Indian students going abroad", win: "Annual call", u: "https://www.jntataendowment.org" },
    { id: "us-phd", n: "US PhD funding package (admission-based)", lv: "phd", w: ["US"], cov: "Typical at research universities: tuition waiver, stipend, health insurance for several years via fellowships, teaching or research assistantships", who: "Everyone admitted. Funding is part of the offer, so apply to programs that fund all admits", win: "Applications usually due December to January for the following autumn", u: "https://www.google.com/search?q=anthropology+PhD+funding+guaranteed+years+stipend" },
    { id: "fulbright", n: "Fulbright-Nehru Fellowships (USIEF)", lv: "phd", w: ["US"], cov: "Master's, and doctoral research stints in the US for Indian PhD students", who: "Indian citizens. Check which category fits", win: "Annual call", u: "https://www.usief.org.in" },
    { id: "vanier", n: "Vanier Canada Graduate Scholarships", lv: "phd", w: ["CA"], cov: "Generous annual award for doctoral students", who: "Domestic and international, nominated by a Canadian university", win: "Nomination runs through the university in autumn", u: "https://vanier.gc.ca" },
    { id: "daad", n: "DAAD Research Grants for doctoral candidates", lv: "phd", w: ["DE"], cov: "Monthly stipend plus allowances", who: "International doctoral candidates", win: "Autumn deadlines in many programmes. Check DAAD", u: "https://www.daad.de" },
    { id: "mpg", n: "Max Planck PhD positions (International Max Planck Research Schools)", lv: "phd", w: ["DE"], cov: "Funded positions", who: "International applicants. The Göttingen institute on religious and ethnic diversity and the Halle institute on social anthropology are both relevant", win: "Posted as calls", u: "https://www.mpg.de" },
    { id: "msca-dn", n: "MSCA Doctoral Networks (EU)", lv: "phd", w: ["EU"], cov: "Employment contract with salary", who: "Early-stage researchers who meet mobility rules", win: "Positions advertised on EURAXESS", u: "https://euraxess.ec.europa.eu" },
    { id: "nordic", n: "Salaried PhD posts (Sweden, Norway, Denmark, Finland, Netherlands)", lv: "phd", w: ["SE", "NO", "DK", "NL"], cov: "A paid job, usually three to four years, no tuition", who: "Open applications to advertised posts. You need a project fit and a Master's", win: "Posts appear year-round. Many close in winter and spring", u: "https://www.academicpositions.com" },
    { id: "swiss", n: "Swiss Government Excellence Scholarships", lv: "phd", w: ["CH"], cov: "Monthly stipend, fees, insurance", who: "Foreign researchers. Not every nationality is eligible, so check", win: "Autumn", u: "https://www.sbfi.admin.ch/scholarships_eng" },
    { id: "rtp", n: "Australian Research Training Program (RTP)", lv: "phd", w: ["AU"], cov: "Fee offset plus living stipend through the university", who: "Applicants to Australian research degrees", win: "Rolling with university rounds", u: "https://www.google.com/search?q=Australian+RTP+scholarship+international+PhD+anthropology" },
    { id: "wg", n: "Wenner-Gren Dissertation Fieldwork Grant", lv: "phd", w: ["any"], cov: "Fieldwork costs for PhD research in anthropology", who: "Doctoral students whose supervisor will sponsor", win: "Twice a year. Check the foundation site", u: "https://wennergren.org" },
    { id: "msca-pf", n: "MSCA Postdoctoral Fellowships (EU)", lv: "postdoc", w: ["EU", "UK"], cov: "Salary plus mobility and research costs", who: "Researchers with a PhD who move countries (mobility rule applies)", win: "Annual call, usually closes in autumn", u: "https://marie-sklodowska-curie-actions.ec.europa.eu" },
    { id: "humboldt", n: "Humboldt Research Fellowship", lv: "postdoc", w: ["DE"], cov: "Monthly stipend, research stay in Germany", who: "Postdocs and experienced researchers, any nationality", win: "Rolling", u: "https://www.humboldt-foundation.de" },
    { id: "lever", n: "Leverhulme Early Career Fellowships", lv: "postdoc", w: ["UK"], cov: "Salary support for early-career researchers at UK universities", who: "Hosted by a UK institution", win: "Annual", u: "https://www.leverhulme.ac.uk" },
    { id: "ba", n: "British Academy Postdoctoral Fellowships", lv: "postdoc", w: ["UK"], cov: "Three years' funding in humanities and social sciences", who: "Early-career researchers with a UK host", win: "Annual", u: "https://www.thebritishacademy.ac.uk" },
    { id: "sshrc", n: "SSHRC Postdoctoral Fellowships", lv: "postdoc", w: ["CA"], cov: "Annual award for postdocs", who: "Via Canadian universities", win: "Annual, autumn", u: "https://www.sshrc-crsh.gc.ca" },
    { id: "banting", n: "Banting Postdoctoral Fellowships (Canada)", lv: "postdoc", w: ["CA"], cov: "Highly competitive two-year award", who: "Postdocs hosted by a Canadian institution", win: "Annual, autumn", u: "https://banting.fellowships-bourses.gc.ca" },
    { id: "snsf", n: "SNSF Postdoc.Mobility (Switzerland)", lv: "postdoc", w: ["CH"], cov: "Fellowship for a research stay abroad", who: "Researchers leaving Switzerland or on a Swiss track. Check eligibility", win: "Twice yearly", u: "https://www.snf.ch" },
    { id: "mpi", n: "Max Planck Institute postdocs", lv: "postdoc", w: ["DE"], cov: "Salaried positions", who: "The Göttingen institute on religious and ethnic diversity is a natural fit", win: "Posted as calls", u: "https://www.mpg.de" },
    { id: "us-pd", n: "US postdocs and societies of fellows", lv: "postdoc", w: ["US"], cov: "Salaried one-to-three-year posts at humanities centres or societies of fellows", who: "Recent PhDs", win: "Autumn ads", u: "https://www.google.com/search?q=anthropology+postdoctoral+fellowship+humanities+center" },
    { id: "erc", n: "ERC Starting Grant", lv: "faculty", w: ["EU"], cov: "Large grant to build a team", who: "Researchers 2 to 7 years after the PhD hosted in Europe", win: "Annual", u: "https://erc.europa.eu" },
    { id: "wg-pd", n: "Wenner-Gren Post-PhD Research Grant", lv: "faculty", w: ["any"], cov: "Support for new research after the PhD", who: "Anthropologists", win: "Twice a year", u: "https://wennergren.org" }
  ];

  // ---------------------------------------------------------------- countries: visa and citizenship ladders
  const CTRY = {
    US: { n: "United States", ph: "Funded at admission at most research universities: stipend, tuition waiver, health insurance. Five to seven years, often with coursework and exams first.", visa: "F-1 student visa. Postdocs usually J-1 or H-1B (universities are usually exempt from the H-1B lottery cap).", work: "OPT after the degree (a year, and extra years only for STEM-designated fields).", long: "Employer-sponsored green card routes (EB-1, EB-2) exist. For people born in India the waiting lines are long, so plan on years, not months.", cit: "Naturalisation generally after five years as a permanent resident. India does not allow dual citizenship, so taking US citizenship usually means giving up Indian citizenship and holding an OCI card instead.", job: "Largest anthropology job market, tenure track with a long, competitive search. Many hold one or two postdocs or visiting posts first.", u: "https://www.uscis.gov" },
    UK: { n: "United Kingdom", ph: "Three to four years, research-focused, funded by scholarships or doctoral training partnerships. Supervisor fit matters most.", visa: "Student visa for the PhD, then a post-study route and skilled worker or Global Talent routes.", work: "Graduate route after the degree (check the current length, which has been under review).", long: "Skilled Worker or Global Talent for researchers, then settlement after a qualifying period (rules have been changing, so check).", cit: "Citizenship after settlement and a further wait. India does not allow dual citizenship (OCI instead).", job: "Lectureship after one or two postdocs. Good fit for South Asia anthropology.", u: "https://www.gov.uk/browse/visas-immigration" },
    CA: { n: "Canada", ph: "Four to five years, funded through university packages and awards. Often master's first.", visa: "Study permit. Doctoral students can usually work.", work: "Post-graduation work permit.", long: "Express Entry and provincial streams. Some provinces have routes for PhD graduates.", cit: "Citizenship after a set number of days as a permanent resident. Canada allows dual citizenship, but India does not.", job: "Smaller anthropology market, strong South Asia centres at Toronto, UBC and McGill.", u: "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
    DE: { n: "Germany", ph: "Three to five years, usually a paid position or a stipend, often in a graduate school or research institute.", visa: "National visa for study or research, and a researcher residence permit for postdocs.", work: "Job-seeking time after the degree, the Opportunity Card, and the EU Blue Card for higher salaries.", long: "Settlement is possible after a few years on a Blue Card or researcher permit.", cit: "Naturalisation rules have changed recently. India still does not allow dual citizenship.", job: "Postdocs are common, the permanent professor path is narrow and very competitive. Max Planck institutes are strong for your field.", u: "https://www.make-it-in-germany.com" },
    NL: { n: "Netherlands", ph: "Four years, usually as an employee with a salary (no tuition).", visa: "Residence permit through the employer or university. Orientation year after graduation.", work: "Search-year visa for graduates, then highly skilled migrant routes.", long: "Permanent residence after about five years of legal stay.", cit: "Naturalisation after about five years. India does not allow dual citizenship.", job: "Postdocs and assistant professor posts. Amsterdam and Leiden are strong in anthropology.", u: "https://ind.nl/en" },
    SE: { n: "Nordics (Sweden, Norway, Denmark, Finland)", ph: "Three to four years as a paid employee, often with a project fixed by the advertisement.", visa: "Residence permit through the employer.", work: "Post-study job-search permits.", long: "Permanent residence after a few years of residence.", cit: "Naturalisation after several years. India does not allow dual citizenship.", job: "Small markets with strong anthropology departments.", u: "https://www.migrationsverket.se" },
    AU: { n: "Australia", ph: "Three to four years, funded by RTP-type scholarships. Often thesis-only.", visa: "Student visa, then a temporary graduate visa.", work: "Temporary graduate visa for degree holders (research graduates can get a longer one).", long: "Skilled migration points and employer routes.", cit: "Citizenship after permanent residence and a residence period. Australia allows dual citizenship; India does not.", job: "Strong South Asia anthropology at ANU, Melbourne and Sydney.", u: "https://immi.homeaffairs.gov.au" },
    CH: { n: "Switzerland", ph: "Four years, employee positions at the university with salary, often through SNSF projects.", visa: "Permit through the university (non-EU quotas apply).", work: "Limited search time after graduation.", long: "Permit renewals, settlement after several years.", cit: "Naturalisation takes a long period of residence. India does not allow dual citizenship.", job: "Postdocs and professorships are rare and competitive.", u: "https://www.sem.admin.ch" }
  };

  // ---------------------------------------------------------------- program seeds (names only; the app builds the search links)
  const UNIS = [
    ["University of Chicago", "US", "Anthropology plus South Asian studies. Strong on political and legal anthropology."],
    ["Columbia University", "US", "Anthropology and MESAAS. Strong on South Asia and political theory."],
    ["Johns Hopkins University", "US", "Anthropology. A major name for the anthropology of violence and the ordinary."],
    ["UC Berkeley", "US", "Anthropology and South and Southeast Asian Studies."],
    ["Stanford University", "US", "Anthropology. Home to a leading scholar of Hindu nationalism."],
    ["New York University", "US", "Anthropology and Social and Cultural Analysis."],
    ["Cornell University", "US", "Anthropology and the South Asia Program."],
    ["University of Pennsylvania", "US", "Anthropology and South Asia Studies."],
    ["Duke University", "US", "Cultural Anthropology."],
    ["University of Washington", "US", "Anthropology and South Asia studies."],
    ["University of Cambridge", "UK", "Social Anthropology. Gates Cambridge is the flagship funding route."],
    ["University of Oxford", "UK", "School of Anthropology and Museum Ethnography; Contemporary South Asian Studies."],
    ["London School of Economics", "UK", "Anthropology. Strong on politics and democracy in South Asia."],
    ["SOAS University of London", "UK", "Anthropology and Sociology, and the South Asia Institute."],
    ["University of Edinburgh", "UK", "Social Anthropology. A long South Asia tradition."],
    ["University College London", "UK", "Anthropology."],
    ["University of Manchester", "UK", "Social Anthropology."],
    ["University of Sussex", "UK", "Anthropology."],
    ["Max Planck Institute for the Study of Religious and Ethnic Diversity", "DE", "Directly on topic: religious and ethnic diversity. Doctoral and postdoctoral positions."],
    ["Max Planck Institute for Social Anthropology (Halle)", "DE", "Social anthropology, including political and legal anthropology."],
    ["Heidelberg University", "DE", "South Asia Institute and social anthropology."],
    ["University of Amsterdam (AISSR)", "NL", "Anthropology and sociology. Salaried PhD model."],
    ["Leiden University", "NL", "Cultural Anthropology and Development Sociology. Strong Asia links."],
    ["University of Zurich", "CH", "Social Anthropology."],
    ["University of Toronto", "CA", "Anthropology and the Centre for South Asian Studies."],
    ["McGill University", "CA", "Anthropology and the Institute of Islamic Studies."],
    ["University of British Columbia", "CA", "Anthropology and the Institute of Asian Research."],
    ["Australian National University", "AU", "School of Culture, History and Language. A major South Asia centre."],
    ["University of Melbourne", "AU", "Anthropology and Asia Institute."],
    ["University of Oslo", "SE", "Social Anthropology. Salaried PhD model."],
    ["Lund University", "SE", "Social Anthropology."],
    ["University of Copenhagen", "SE", "Anthropology. Salaried PhD model."]
  ];

  // Scholars worth reading and possibly contacting. Affiliations move: check each one.
  const SCHOLARS = [
    ["Arjun Appadurai", "NYU", "Fear of Small Numbers; globalisation and violence"],
    ["Veena Das", "Johns Hopkins", "Anthropology of violence and the ordinary"],
    ["Thomas Blom Hansen", "Stanford", "Hindu nationalism, the Saffron Wave"],
    ["Christophe Jaffrelot", "CERI Sciences Po and King's College London", "Hindu nationalism and ethnic democracy"],
    ["Angana P. Chatterji", "UC Berkeley", "Ethnography of Hindu nationalism, Violent Gods"],
    ["Sahana Udupa", "LMU Munich", "Digital hate, media anthropology, India"],
    ["Jonathan Spencer", "Edinburgh", "Politics and anthropology of South Asia"],
    ["Ward Berenschot", "KITLV Leiden / University of Amsterdam", "Riot politics, clientelism, Gujarat"],
    ["Mukulika Banerjee", "LSE", "Democracy and everyday politics in South Asia"],
    ["Kalyani Devaki Menon", "DePaul", "Everyday nationalism, women of the Hindu right"],
    ["Hilal Ahmed", "CSDS Delhi", "Muslim political discourse in India"],
    ["Gilles Verniers", "Ashoka University", "Electoral politics and political data"],
    ["Radhika Govindrajan", "University of Chicago", "Animal intimacies, cow protection and Hindu nationalism"],
    ["Partha Chatterjee", "Columbia", "Nationalism and politics in postcolonial India"],
    ["Mahmood Mamdani", "Columbia and Makerere", "Political identity, violence, the colonial state"],
    ["Alexander Laban Hinton", "Rutgers", "Anthropology of genocide"],
    ["Nandini Sundar", "University of Delhi", "State violence, sociology, Chhattisgarh"],
    ["Ritty Lukose", "NYU", "Youth, gender and consumption in India"],
    ["Ashutosh Varshney", "Brown", "Hindu-Muslim relations, civic life, political science"],
    ["Subir Sinha", "SOAS", "Political economy and social movements in India"]
  ];

  // ---------------------------------------------------------------- Indian foods, approximate, one common serving
  // [name, serving, kcal, protein g]
  const FOODS = [
    ["Roti / chapati", "1 medium", 100, 3], ["Paratha (plain)", "1", 230, 5], ["Rice, cooked", "1 cup", 200, 4], ["Dal", "1 katori", 150, 8],
    ["Rajma", "1 katori", 190, 9], ["Chole", "1 katori", 200, 8], ["Sabzi", "1 katori", 120, 3], ["Paneer", "100 g", 265, 18], ["Egg, boiled", "1", 75, 6],
    ["Omelette", "2 eggs", 190, 12], ["Chicken curry", "1 serving", 250, 25], ["Fish curry", "1 serving", 220, 22], ["Idli", "1", 60, 2], ["Dosa (plain)", "1", 130, 3],
    ["Poha", "1 plate", 250, 5], ["Upma", "1 plate", 250, 6], ["Khichdi", "1 plate", 300, 10], ["Biryani", "1 plate", 500, 20], ["Samosa", "1", 260, 4],
    ["Curd / dahi", "1 katori", 60, 3], ["Milk", "1 glass (250 ml)", 150, 8], ["Chai with sugar", "1 cup", 90, 2], ["Banana", "1", 105, 1], ["Apple", "1", 95, 0.5],
    ["Oats", "40 g dry", 150, 5], ["Whey protein", "1 scoop", 120, 24], ["Almonds", "10", 70, 2.5], ["Peanut butter", "1 tbsp", 95, 4], ["Bread", "1 slice", 80, 3],
    ["Sprouts salad", "1 bowl", 120, 8], ["Soya chunks, cooked", "50 g dry", 170, 26], ["Buttermilk", "1 glass", 40, 2]
  ];

  root.KB = { FEEDS, FEED_CATS, FOCUS, T, CANON, FUND, CTRY, UNIS, SCHOLARS, FOODS };
  if (typeof module !== "undefined") module.exports = root.KB;
})(typeof window !== "undefined" ? window : globalThis);
