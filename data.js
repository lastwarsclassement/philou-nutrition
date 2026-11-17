/* Données du document — g pour 100 g. [nom, état, P, G, L]  'tr' = traces ; '<x' = moins de x
   Sources : Ciqual 2025 (Anses), moyennes arrondies. Skyr : étiquette du produit. */
const CATS = [
  {id:'feculents', t:'Féculents, pains et céréales', em:'🍚', items:[
    ['Riz basmati ou thaï','cru',7.4,78.4,0.6],['Riz basmati','cuit',3.2,32.9,0.4],
    ['Riz blanc','cru',7.4,77.5,0.8],['Riz blanc','cuit',3.3,33.2,0.7],
    ['Riz complet','cru',7.4,71.4,2.8],['Riz complet','cuit',4.1,37.6,1.8],
    ['Pâtes classiques','sèches',13.1,72.7,1.6],['Pâtes classiques','cuites',6.7,31.4,1.1],
    ['Pâtes complètes','sèches',12.6,67.6,2.2],['Pâtes complètes','cuites',7.9,31.3,1.4],
    ['Pomme de terre','crue, sans peau',2.0,16.2,0.1],['Pomme de terre','cuite à l’eau',1.8,16.8,0.3],
    ['Patate douce','cuite',1.7,16.3,0.2],
    ['Semoule de couscous','sèche',13.5,72.7,1.3],['Semoule de couscous','cuite',6.4,31.0,0.9],
    ['Quinoa','cru',14.1,58.1,6.1],['Quinoa','cuit',5.0,27.9,1.1],['Boulgour','cuit',4.6,24.1,1.0],
    ['Flocons d’avoine','secs',11.4,57.7,7.8],['Pain blanc type baguette','',9.1,58.3,1.4],['Pain complet','',9.5,41.2,1.7]
  ]},
  {id:'legumineuses', t:'Légumineuses et protéines végétales', em:'🫘', items:[
    ['Lentilles','sèches',25.1,44.5,1.8],['Lentilles vertes','cuites',10.1,16.2,0.6],['Lentilles corail','cuites',10.6,15.0,0.5],
    ['Pois chiches','cuits à l’eau',8.3,17.7,3.0],['Haricots rouges','cuits à l’eau',9.6,12.3,0.6],['Haricots blancs','cuits à l’eau',6.8,12.0,1.1],
    ['Tofu nature','',14.7,2.9,8.5],['Tofu fumé','',16.4,2.9,9.5],['Tempeh','',17.6,7.9,4.7]
  ]},
  {id:'viandes', t:'Viandes et œufs', em:'🍗', items:[
    ['Filet de poulet sans peau','cru',23.4,0,1.5],['Filet de poulet sans peau','grillé',30.1,0,2.0],
    ['Escalope de dinde','crue',23.7,0,1.5],['Escalope de dinde','grillée',28.5,0,1.1],
    ['Escalope de veau','crue',20.5,0.6,3.3],['Filet mignon de porc','cru',21.2,0.4,4.1],['Jambon blanc cuit supérieur','',21.0,0.8,2.8],
    ['Steak haché de bœuf 5 % MG','cru',21.9,0.3,4.6],['Steak haché de bœuf 5 % MG','cuit',25.5,0,5.9],
    ['Steak haché de bœuf 10 % MG','cru',20.0,0,10.0],['Steak haché de bœuf 15 % MG','cru',20.2,0.5,14.8],
    ['Rumsteck de bœuf','cru',23.5,0.4,2.5],['Entrecôte de bœuf','crue',19.4,0,17.1],['Gigot d’agneau','cru',20.0,0.5,5.1],
    ['Œuf entier dur, sans coquille','',13.5,0.5,8.6],['Blanc d’œuf','cuit',10.3,1.1,0.2]
  ]},
  {id:'poissons-gras', t:'Poissons gras', em:'🐟', items:[
    ['Saumon d’élevage','cru',20.5,'tr',12.4],['Saumon d’élevage','cuit au four',22.1,1.0,13.5],['Saumon fumé','',22.1,0.1,11.0],
    ['Maquereau','cru',18.1,0.9,13.5],['Sardines','crues',19.5,0,9.2],['Sardines à l’huile d’olive','égouttées',23.3,0.1,14.5],
    ['Truite arc-en-ciel d’élevage','crue',19.0,0,6.2]
  ]},
  {id:'poissons-maigres', t:'Poissons maigres et fruits de mer', em:'🦐', items:[
    ['Cabillaud','cru',18.1,'tr',0.6],['Cabillaud','cuit à la vapeur',24.5,'tr',1.0],['Merlu','cru',17.6,0,1.4],['Lieu noir','cru',18.8,0,0.8],
    ['Thon albacore','cru',25.0,1.0,0.9],['Thon en boîte au naturel','égoutté',26.8,0,3.9],['Crevettes','cuites, décortiquées',20.5,0.2,0.8]
  ]},
  {id:'laitiers', t:'Produits laitiers', em:'🥛', items:[
    ['Skyr nature Danone','',10.0,3.9,0.2],['Fromage blanc nature 0 %','',7.2,4.2,'<0,1'],['Fromage blanc nature 2–3 %','',7.1,3.9,3.2],
    ['Yaourt nature','',3.8,4.3,1.7],['Yaourt nature 0 %','',4.1,4.9,'<0,1'],['Yaourt à la grecque nature','',3.0,3.7,8.2],
    ['Lait demi-écrémé','',3.4,5.0,1.6],['Mozzarella au lait de vache','',16.1,0.7,17.7],['Feta','',14.8,0.5,24.3],['Emmental','',27.3,'tr',28.8],['Comté','',27.2,'tr',33.8]
  ]},
  {id:'fruits', t:'Fruits frais', em:'🍓', head:'Aliment cru', items:[
    ['Banane','',1.1,19.7,'<0,5'],['Raisin','',0.7,16.3,0.3],['Mangue','',0.6,14.3,'<0,5'],['Poire','',0.4,12.3,0.3],
    ['Ananas','',0.3,11.7,'<0,5'],['Pomme','',0.3,11.6,0.3],['Kiwi','',0.9,11.0,0.6],['Myrtilles','',0.9,10.6,0.3],
    ['Clémentine ou mandarine','',0.8,9.2,'<0,5'],['Pastèque','',0.7,8.3,'<0,5'],['Orange','',0.8,8.0,'<0,5'],['Pêche','',0.9,7.6,0.3],
    ['Fraises','',0.6,6.0,'<0,5'],['Framboises','',1.2,5.8,0.8],['Avocat','',1.6,'tr',20.6]
  ]},
  {id:'legumes', t:'Légumes', em:'🥦', items:[
    ['Maïs doux en conserve','égoutté',2.7,18.3,1.7],['Petits pois','cuits à l’eau',6.4,9.9,0.6],['Betterave','cuite',1.4,7.1,0.4],
    ['Poivron rouge','cru',1.1,6.0,'<0,5'],['Carotte','crue',0.8,5.2,'<0,5'],['Aubergine','cuite',0.8,4.2,0.2],['Tomate','crue',0.6,3.7,'<0,5'],
    ['Haricots verts','cuits à l’eau',1.8,3.4,'<0,3'],['Chou-fleur','cuit à la vapeur',2.6,3.4,0.3],['Concombre','cru avec peau',0.7,2.9,0.1],
    ['Brocoli','cuit',3.2,1.8,0.6],['Champignons de Paris','crus',2.1,1.8,0.4],['Courgette','cuite',0.9,1.4,0.4],['Laitue','crue',1.4,1.2,0.2],['Épinards','cuits',3.2,0.3,0.1]
  ]},
  {id:'ajouts', t:'Huiles, fruits à coque et autres ajouts', em:'🥜', items:[
    ['Huile d’olive vierge extra','',0.3,'tr',99.9],['Huile de colza','',0,0,100],['Beurre doux','',0.6,0.7,83.0],
    ['Amandes avec peau','',22.6,9.5,51.3],['Cerneaux de noix','',15.7,6.9,67.3],['Noisettes','',17.0,7.2,56.9],['Noix de cajou grillées non salées','',20.5,21.3,48.1],
    ['Beurre de cacahuètes, moyenne Ciqual','',25.4,17.3,51.4],['Graines de chia','',19.5,7.7,30.7],['Chocolat noir 70 %','',10.4,26.9,46.3]
  ]}
];

/* Journées types du PDF — [nom, état, grammes] par repas */
const TEMPLATES = {
  repos: {
    pdj: [['Skyr nature Danone','',200],['Flocons d’avoine','secs',40],['Banane','',100],['Beurre de cacahuètes, moyenne Ciqual','',20]],
    dej: [['Filet de poulet sans peau','cru',210],['Pomme de terre','cuite à l’eau',300],['Haricots verts','cuits à l’eau',150],['Huile d’olive vierge extra','',10]],
    col: [['Skyr nature Danone','',170],['Pomme','',150],['Amandes avec peau','',15]],
    din: [['Saumon d’élevage','cru',160],['Riz basmati ou thaï','cru',45],['Brocoli','cuit',150],['Huile d’olive vierge extra','',5]]
  },
  sport: {
    pdj: [['Skyr nature Danone','',200],['Flocons d’avoine','secs',60],['Banane','',150],['Beurre de cacahuètes, moyenne Ciqual','',20]],
    dej: [['Filet de poulet sans peau','cru',170],['Pomme de terre','cuite à l’eau',400],['Haricots verts','cuits à l’eau',150],['Huile d’olive vierge extra','',10]],
    col: [['Skyr nature Danone','',170],['Pomme','',150],['Amandes avec peau','',15],['Banane','',120]],
    din: [['Saumon d’élevage','cru',160],['Riz basmati ou thaï','cru',95],['Brocoli','cuit',150],['Huile d’olive vierge extra','',4]]
  }
};

const DEFAULT_SETTINGS = {kcal_rest:1900, kcal_sport:2300, protein:150, carbs_rest:172, carbs_sport:272, fat:68};
