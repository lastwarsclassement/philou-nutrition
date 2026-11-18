/* Recettes de plats du quotidien, version allégée.
   Ingrédients pour la recette entière : [aliment, grammes, nom affiché]
   aliment = « nom|état » d'un aliment du plan (data.js) ou nom exact d'un aliment de la table Ciqual (ciqual.js).
   Féculents en poids cuit : le poids de la recette ≈ le poids du plat dans l'assiette. */
const RECIPE_CATS = [['plat', 'Plats', '🍽️'], ['salade', 'Salades et bowls', '🥗'], ['soupe', 'Soupes', '🥣'], ['pdj', 'Petit-déj et collations', '🥞']];
const RECIPES = [
  {id:'curry', n:'Poulet curry coco et riz', em:'🍛', cat:'plat', parts:2, min:30, ing:[
    ['Filet de poulet sans peau|cru',300,'Filet de poulet'],['Oignon, cru',100,'Oignon'],['Courgette, chair et peau, crue',200,'Courgette'],
    ['Lait de coco',100,'Lait de coco'],['Tomate, coulis, appertisé (purée de tomates mi-réduite à 11%)',100,'Coulis de tomate'],
    ['Curry, poudre',6,'Curry en poudre'],['Huile d’olive vierge extra|',10,'Huile d’olive'],['Riz basmati|cuit',360,'Riz basmati (cuit)']],
    steps:['Coupe le poulet en dés, l’oignon et la courgette en morceaux.','Fais revenir l’oignon dans l’huile 3 min, ajoute le poulet et le curry, puis dore 5 min.','Ajoute la courgette, le lait de coco et le coulis de tomate. Laisse mijoter 15 min à feu doux.','Sers avec le riz.']},
  {id:'bolo', n:'Pâtes complètes à la bolognaise', em:'🍝', cat:'plat', parts:2, min:30, ing:[
    ['Steak haché de bœuf 5 % MG|cru',250,'Bœuf haché 5 % MG'],['Oignon, cru',80,'Oignon'],['Carotte|crue',80,'Carotte'],
    ['Tomate, coulis, appertisé (purée de tomates mi-réduite à 11%)',300,'Coulis de tomate'],['Herbes de Provence, séchées',2,'Herbes de Provence'],
    ['Huile d’olive vierge extra|',10,'Huile d’olive'],['Pâtes complètes|cuites',400,'Pâtes complètes (cuites)'],['Parmesan',20,'Parmesan']],
    steps:['Hache l’oignon et râpe la carotte.','Fais-les revenir dans l’huile 5 min, ajoute le bœuf et émiette-le jusqu’à ce qu’il soit cuit.','Ajoute le coulis et les herbes, laisse mijoter 15 min.','Sers sur les pâtes avec le parmesan.']},
  {id:'chili', n:'Chili con carne', em:'🌶️', cat:'plat', parts:4, min:45, ing:[
    ['Steak haché de bœuf 5 % MG|cru',500,'Bœuf haché 5 % MG'],['Haricot rouge, appertisé, égoutté',400,'Haricots rouges en boîte (égouttés)'],
    ['Tomate, pelée, appertisée, au jus, non égouttée',800,'Tomates pelées en boîte'],['Oignon, cru',150,'Oignon'],['Poivron rouge|cru',200,'Poivron rouge'],
    ['Maïs doux en conserve|égoutté',140,'Maïs en boîte (égoutté)'],['Cumin, graine',6,'Cumin'],['Huile d’olive vierge extra|',15,'Huile d’olive'],['Riz blanc|cuit',600,'Riz (cuit)']],
    steps:['Fais revenir l’oignon et le poivron émincés dans l’huile 5 min.','Ajoute le bœuf et le cumin, fais dorer en émiettant.','Ajoute les tomates, les haricots et le maïs. Laisse mijoter 25 min.','Sers avec le riz. Se garde 3 jours au frigo, se congèle bien.']},
  {id:'parmentier', n:'Hachis parmentier léger', em:'🥔', cat:'plat', parts:4, min:50, ing:[
    ['Steak haché de bœuf 5 % MG|cru',500,'Bœuf haché 5 % MG'],['Oignon, cru',150,'Oignon'],['Carotte|crue',200,'Carotte'],
    ['Pomme de terre|cuite à l’eau',900,'Pommes de terre (cuites)'],['Lait demi-écrémé|',150,'Lait demi-écrémé'],
    ['Emmental ou emmenthal, râpé',60,'Emmental râpé'],['Huile d’olive vierge extra|',10,'Huile d’olive']],
    steps:['Écrase les pommes de terre avec le lait chaud pour faire une purée.','Fais revenir l’oignon et la carotte hachés dans l’huile, ajoute le bœuf et fais-le cuire.','Dans un plat : la viande au fond, la purée dessus, l’emmental pour finir.','Enfourne 20 min à 200 °C.']},
  {id:'papillote', n:'Saumon en papillote, légumes et riz complet', em:'🐟', cat:'plat', parts:2, min:30, ing:[
    ['Saumon d’élevage|cru',260,'Pavés de saumon'],['Courgette, chair et peau, crue',250,'Courgette'],['Poivron rouge|cru',150,'Poivron rouge'],
    ['Jus de citron, pur jus',20,'Jus de citron'],['Huile d’olive vierge extra|',5,'Huile d’olive'],['Riz complet|cuit',300,'Riz complet (cuit)']],
    steps:['Coupe les légumes en fines lanières.','Sur du papier cuisson : légumes, saumon, citron, un filet d’huile, sel, poivre. Ferme la papillote.','Enfourne 20 min à 200 °C.','Sers avec le riz.']},
  {id:'cabillaud', n:'Cabillaud, purée maison et haricots verts', em:'🐠', cat:'plat', parts:2, min:30, ing:[
    ['Cabillaud|cru',340,'Dos de cabillaud'],['Pomme de terre|cuite à l’eau',500,'Pommes de terre (cuites)'],['Lait demi-écrémé|',100,'Lait demi-écrémé'],
    ['Beurre doux|',10,'Beurre'],['Haricots verts|cuits à l’eau',300,'Haricots verts (cuits)'],['Huile d’olive vierge extra|',5,'Huile d’olive']],
    steps:['Écrase les pommes de terre avec le lait chaud et le beurre.','Fais cuire le cabillaud à la poêle avec l’huile, 4 min par face (ou 12 min à la vapeur).','Sers avec la purée et les haricots verts.']},
  {id:'steak', n:'Steak haché, pommes de terre sautées et haricots verts', em:'🥩', cat:'plat', parts:1, min:20, ing:[
    ['Steak haché de bœuf 5 % MG|cru',125,'Steak haché 5 % MG'],['Pomme de terre|cuite à l’eau',250,'Pommes de terre (cuites)'],
    ['Huile d’olive vierge extra|',8,'Huile d’olive'],['Haricots verts|cuits à l’eau',200,'Haricots verts (cuits)']],
    steps:['Coupe les pommes de terre cuites en dés et fais-les dorer à la poêle avec l’huile 10 min.','Cuis le steak 2 à 3 min par face.','Sers avec les haricots verts.']},
  {id:'wok', n:'Wok de dinde aux légumes et vermicelles de riz', em:'🥢', cat:'plat', parts:2, min:25, ing:[
    ['Escalope de dinde|crue',300,'Escalopes de dinde'],['Brocoli, cru',200,'Brocoli'],['Carotte|crue',120,'Carotte'],['Poivron rouge|cru',150,'Poivron rouge'],
    ['Gingembre, racine fraîche',10,'Gingembre frais'],['Sauce soja, préemballée',30,'Sauce soja'],['Huile d’olive vierge extra|',10,'Huile'],
    ['Vermicelle de riz, cuite, sans sel ajouté',300,'Vermicelles de riz (cuites)']],
    steps:['Coupe la dinde en lanières et les légumes en petits morceaux.','Saisis la dinde dans l’huile très chaude 4 min, réserve.','Fais sauter les légumes et le gingembre râpé 5 min, ils doivent rester croquants.','Remets la dinde, ajoute les vermicelles et la sauce soja, mélange 1 min.']},
  {id:'couscous', n:'Couscous au poulet et légumes', em:'🍲', cat:'plat', parts:4, min:60, ing:[
    ['Poulet, cuisse, viande crue',500,'Cuisses de poulet sans peau'],['Carotte|crue',250,'Carottes'],['Courgette, chair et peau, crue',300,'Courgettes'],
    ['Pois chiche, appertisé, égoutté',240,'Pois chiches en boîte (égouttés)'],['Oignon, cru',100,'Oignon'],
    ['Tomate, pelée, appertisée, au jus, non égouttée',400,'Tomates pelées en boîte'],['Bouillon de volaille, déshydraté',10,'Bouillon de volaille (1 cube)'],
    ['Huile d’olive vierge extra|',15,'Huile d’olive'],['Semoule de couscous|cuite',600,'Semoule (cuite)']],
    steps:['Fais dorer le poulet et l’oignon dans l’huile dans une grande cocotte.','Ajoute les tomates, le cube de bouillon et 1 litre d’eau, laisse cuire 20 min.','Ajoute les carottes, puis 10 min après les courgettes et les pois chiches. Cuis encore 15 min.','Sers avec la semoule et le bouillon.']},
  {id:'lentilles', n:'Lentilles, carottes et filet mignon', em:'🫘', cat:'plat', parts:2, min:35, ing:[
    ['Filet mignon de porc|cru',280,'Filet mignon de porc'],['Lentilles vertes|cuites',400,'Lentilles vertes (cuites)'],['Carotte|crue',200,'Carottes'],
    ['Oignon, cru',80,'Oignon'],['Huile d’olive vierge extra|',10,'Huile d’olive']],
    steps:['Coupe le filet mignon en médaillons, les carottes en rondelles.','Dore les médaillons dans l’huile 3 min par face, réserve.','Fais revenir l’oignon et les carottes, ajoute un fond d’eau et cuis 15 min.','Ajoute les lentilles et la viande, réchauffe 5 min.']},
  {id:'omelette', n:'Omelette aux champignons, salade et pain complet', em:'🍳', cat:'plat', parts:1, min:15, ing:[
    ['Oeuf cru',165,'Œufs (3)'],['Champignons de Paris|crus',150,'Champignons de Paris'],['Emmental ou emmenthal, râpé',15,'Emmental râpé'],
    ['Huile d’olive vierge extra|',5,'Huile d’olive'],['Salade verte, crue, sans assaisonnement',80,'Salade verte'],['Pain complet|',60,'Pain complet']],
    steps:['Fais sauter les champignons émincés dans l’huile 5 min.','Bats les œufs, verse-les sur les champignons et ajoute l’emmental.','Plie l’omelette quand elle est encore baveuse. Sers avec la salade et le pain.']},
  {id:'quiche', n:'Quiche sans pâte jambon-courgette', em:'🥧', cat:'plat', parts:4, min:45, ing:[
    ['Oeuf cru',330,'Œufs (6)'],['Lait demi-écrémé|',300,'Lait demi-écrémé'],['Jambon cuit, supérieur',150,'Jambon blanc'],
    ['Courgette, chair et peau, crue',300,'Courgettes'],['Emmental ou emmenthal, râpé',60,'Emmental râpé'],['Farine de blé tendre ou froment T65',40,'Farine']],
    steps:['Râpe les courgettes et presse-les pour enlever l’eau. Coupe le jambon en dés.','Fouette les œufs, la farine et le lait, puis ajoute courgettes, jambon et emmental.','Verse dans un moule huilé et enfourne 35 min à 180 °C.','Bon chaud ou froid, avec une salade verte.']},
  {id:'croque', n:'Croque-monsieur léger', em:'🥪', cat:'plat', parts:1, min:15, ing:[
    ['Pain de mie complet, préemballé',100,'Pain de mie complet (4 tranches)'],['Jambon cuit, supérieur',45,'Jambon blanc (1 tranche)'],
    ['Fromage blanc nature 0 %|',30,'Fromage blanc 0 %'],['Emmental ou emmenthal, râpé',20,'Emmental râpé'],
    ['Salade verte, crue, sans assaisonnement',80,'Salade verte']],
    steps:['Tartine le pain de fromage blanc, garnis de jambon et d’emmental.','Passe 10 min au four à 200 °C ou à l’appareil à croque.','Sers avec la salade.']},
  {id:'pizza', n:'Pizza maison jambon-champignons', em:'🍕', cat:'plat', parts:2, min:30, ing:[
    ['Pâte à pizza, préemballée, crue',260,'Pâte à pizza'],['Tomate, coulis, appertisé (purée de tomates mi-réduite à 11%)',100,'Coulis de tomate'],
    ['Mozzarella au lait de vache|',125,'Mozzarella (1 boule)'],['Jambon cuit, supérieur',80,'Jambon blanc'],['Champignons de Paris|crus',100,'Champignons'],
    ['Huile d’olive vierge extra|',5,'Huile d’olive']],
    steps:['Étale la pâte, couvre de coulis.','Ajoute le jambon, les champignons émincés et la mozzarella en morceaux, puis un filet d’huile.','Enfourne 12 à 15 min à 240 °C.']},
  {id:'burger', n:'Burger maison', em:'🍔', cat:'plat', parts:1, min:15, ing:[
    ['Pain pour burger ou hot dog (bun), préemballé',75,'Pain burger'],['Steak haché de bœuf 5 % MG|cru',125,'Steak haché 5 % MG'],
    ['Emmental|',20,'Emmental (1 tranche)'],['Tomate|crue',50,'Tomate'],['Salade verte, crue, sans assaisonnement',20,'Salade'],
    ['Oignon rouge, cru',20,'Oignon rouge'],['Moutarde',5,'Moutarde']],
    steps:['Cuis le steak 2 à 3 min par face, pose l’emmental dessus en fin de cuisson.','Toaste le pain, tartine de moutarde.','Monte le burger : salade, steak, tomate, oignon.','Accompagnement léger : crudités ou haricots verts plutôt que des frites.']},
  {id:'wrap', n:'Wraps poulet crudités', em:'🌯', cat:'salade', parts:2, min:15, ing:[
    ['Tortilla souple (à garnir), à base de blé',120,'Tortillas de blé (2)'],['Filet de poulet sans peau|cru',220,'Filet de poulet'],
    ['Fromage blanc nature 0 %|',60,'Fromage blanc 0 %'],['Curry, poudre',2,'Curry'],['Salade verte, crue, sans assaisonnement',60,'Salade'],
    ['Tomate|crue',150,'Tomate'],['Maïs doux en conserve|égoutté',60,'Maïs'],['Huile d’olive vierge extra|',5,'Huile']],
    steps:['Cuis le poulet en lanières dans l’huile 6 min.','Mélange le fromage blanc et le curry pour la sauce.','Garnis chaque tortilla de sauce, salade, tomate, maïs et poulet, puis roule-la.']},
  {id:'nicoise', n:'Salade niçoise', em:'🥗', cat:'salade', parts:2, min:20, ing:[
    ['Thon en boîte au naturel|égoutté',200,'Thon au naturel (égoutté)'],['Œuf entier dur, sans coquille|',110,'Œufs durs (2)'],
    ['Pomme de terre|cuite à l’eau',300,'Pommes de terre (cuites)'],['Haricots verts|cuits à l’eau',200,'Haricots verts (cuits)'],['Tomate|crue',250,'Tomates'],
    ['Olive noire (aliment moyen)',30,'Olives noires'],['Huile d’olive vierge extra|',15,'Huile d’olive'],['Vinaigre',10,'Vinaigre']],
    steps:['Coupe les pommes de terre, les tomates et les œufs.','Dispose tous les ingrédients dans un saladier.','Arrose d’huile et de vinaigre au moment de servir.']},
  {id:'quinoa', n:'Salade quinoa, poulet et feta', em:'🥙', cat:'salade', parts:2, min:20, ing:[
    ['Quinoa|cuit',300,'Quinoa (cuit)'],['Filet de poulet sans peau|cru',240,'Filet de poulet'],['Feta|',60,'Feta'],
    ['Concombre|cru avec peau',200,'Concombre'],['Tomate|crue',200,'Tomates'],['Huile d’olive vierge extra|',15,'Huile d’olive'],['Jus de citron, pur jus',20,'Jus de citron']],
    steps:['Cuis le poulet à la poêle, coupe-le en dés.','Coupe le concombre, les tomates et la feta.','Mélange le tout avec le quinoa, l’huile et le citron. Se prépare la veille pour le midi.']},
  {id:'poke', n:'Poke bowl au saumon', em:'🍣', cat:'salade', parts:2, min:20, ing:[
    ['Riz blanc|cuit',300,'Riz (cuit)'],['Saumon d’élevage|cru',220,'Saumon très frais (ou cuit)'],['Avocat|',100,'Avocat (½ gros)'],
    ['Concombre|cru avec peau',150,'Concombre'],['Mangue|',120,'Mangue'],['Carotte|crue',100,'Carotte'],
    ['Sauce soja, préemballée',30,'Sauce soja'],['Sésame, graine',10,'Graines de sésame']],
    steps:['Coupe le saumon en cubes et fais-le mariner 10 min dans la sauce soja.','Coupe l’avocat, le concombre et la mangue, râpe la carotte.','Dans des bols : le riz, puis les garnitures et le saumon. Parsème de sésame.']},
  {id:'shakshuka', n:'Shakshuka (œufs à la tomate et aux poivrons)', em:'🍅', cat:'plat', parts:2, min:30, ing:[
    ['Oeuf cru',220,'Œufs (4)'],['Tomate, pelée, appertisée, au jus, non égouttée',400,'Tomates pelées en boîte'],['Poivron rouge|cru',200,'Poivron rouge'],
    ['Oignon, cru',100,'Oignon'],['Cumin, graine',3,'Cumin'],['Huile d’olive vierge extra|',10,'Huile d’olive'],['Pain complet|',100,'Pain complet']],
    steps:['Fais revenir l’oignon et le poivron émincés dans l’huile 8 min.','Ajoute les tomates et le cumin, laisse réduire 10 min.','Creuse 4 puits, casse un œuf dans chacun, couvre et cuis 6 à 8 min.','Sers avec le pain.']},
  {id:'dahl', n:'Dahl de lentilles corail et riz', em:'🍛', cat:'plat', parts:4, min:35, ing:[
    ['Lentille corail, sèche',250,'Lentilles corail (sèches)'],['Lait de coco',200,'Lait de coco'],['Tomate, pelée, appertisée, au jus, non égouttée',400,'Tomates pelées en boîte'],
    ['Oignon, cru',150,'Oignon'],['Épinard, cru',200,'Épinards frais'],['Curry, poudre',10,'Curry'],['Huile d’olive vierge extra|',10,'Huile'],
    ['Riz basmati|cuit',600,'Riz basmati (cuit)']],
    steps:['Fais revenir l’oignon et le curry dans l’huile.','Ajoute les lentilles rincées, les tomates, le lait de coco et 600 ml d’eau.','Cuis 20 min en remuant, jusqu’à ce que les lentilles fondent. Ajoute les épinards à la fin.','Sers avec le riz. Plat végétarien, se congèle bien.']},
  {id:'potiron', n:'Velouté de potiron', em:'🎃', cat:'soupe', parts:4, min:35, ing:[
    ['Potiron, cru',1000,'Potiron'],['Pomme de terre, sans peau, crue',300,'Pommes de terre'],['Oignon, cru',100,'Oignon'],
    ['Bouillon de légumes, déshydraté',10,'Bouillon de légumes (1 cube)'],['Spécialité à base de crème légère 4% MG environ, fluide ou épaisse',100,'Crème légère 4 %']],
    steps:['Épluche et coupe les légumes en morceaux.','Couvre d’eau avec le cube de bouillon et cuis 25 min.','Mixe avec la crème. Bon en entrée, ou avec une tranche de jambon et du pain pour un dîner léger.']},
  {id:'soupe', n:'Soupe de légumes maison', em:'🥕', cat:'soupe', parts:4, min:40, ing:[
    ['Poireau, cru',300,'Poireaux'],['Carotte|crue',300,'Carottes'],['Courgette, chair et peau, crue',300,'Courgettes'],
    ['Pomme de terre, sans peau, crue',300,'Pommes de terre'],['Oignon, cru',100,'Oignon'],['Bouillon de légumes, déshydraté',10,'Bouillon de légumes (1 cube)']],
    steps:['Coupe tous les légumes en morceaux.','Couvre d’eau (environ 1,2 litre) avec le cube et cuis 30 min.','Mixe ou laisse en morceaux. Très peu calorique : ajoute un œuf, du jambon ou du fromage blanc pour les protéines.']},
  {id:'porridge', n:'Porridge protéiné à la banane', em:'🥣', cat:'pdj', parts:1, min:5, ing:[
    ['Flocons d’avoine|secs',50,'Flocons d’avoine'],['Lait demi-écrémé|',200,'Lait demi-écrémé'],['Skyr nature Danone|',100,'Skyr'],
    ['Banane|',100,'Banane'],['Beurre de cacahuètes, moyenne Ciqual|',10,'Beurre de cacahuète']],
    steps:['Cuis les flocons dans le lait 3 min (ou 2 min au micro-ondes).','Hors du feu, mélange le skyr.','Ajoute la banane en rondelles et le beurre de cacahuète.']},
  {id:'pancakes', n:'Pancakes avoine-banane', em:'🥞', cat:'pdj', parts:2, min:20, ing:[
    ['Flocons d’avoine|secs',80,'Flocons d’avoine'],['Oeuf cru',110,'Œufs (2)'],['Banane|',120,'Banane'],['Lait demi-écrémé|',100,'Lait demi-écrémé'],
    ['Fromage blanc nature 0 %|',100,'Fromage blanc 0 %'],['Levure chimique ou poudre à lever',5,'Levure chimique'],['Huile d’olive vierge extra|',4,'Huile (pour la poêle)']],
    steps:['Mixe tous les ingrédients sauf l’huile.','Fais cuire de petites louches dans une poêle huilée, 2 min par face.','Bon avec des fruits rouges ou un peu de skyr.']},
  {id:'skyrbowl', n:'Bol de skyr aux fruits rouges et amandes', em:'🍓', cat:'pdj', parts:1, min:3, ing:[
    ['Skyr nature Danone|',200,'Skyr'],['Fruits rouges, crus (framboises, fraises, groseilles, cassis)',120,'Fruits rouges (frais ou surgelés)'],
    ['Amandes avec peau|',15,'Amandes'],['Miel',10,'Miel']],
    steps:['Verse le skyr dans un bol.','Ajoute les fruits rouges, les amandes concassées et le miel.']}
];
