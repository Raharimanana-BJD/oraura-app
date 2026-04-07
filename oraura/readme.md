Comment utiliser ce fichier avec un agent IA :
Ouvre ton éditeur (ex: Cursor).

Crée un fichier nommé context.md à la racine de ton projet.

Dans ton prompt, dis-lui : "Référencie le fichier context.md pour comprendre l'architecture de mon projet. Je veux maintenant que tu génères [le composant X / la route Y / la commande Rust Z]."

===========================================================================================

Pour que l'IA (comme Cursor, Windsurf ou ChatGPT) construise ton application sans s'emmêler les pinceaux, tu dois procéder par **étapes logiques**, du backend vers le frontend. 

Voici l'ordre exact des instructions (prompts) à lui donner :

---

### Étape 1 : Initialisation du projet et de la base de données
C'est la fondation. Sans les types de données corrects, le reste sera instable.

> **Prompt à copier :**
> "Basé sur le fichier `CONTEXT.md`, initialise un projet Tauri 2.0 avec React 19 et TypeScript. Utilise `pnpm` comme gestionnaire de paquets et `shadcn/ui` pour les composants. Ensuite, configure Prisma avec le schéma PostgreSQL décrit dans le contexte. Génère le client Prisma et crée un script de 'seed' pour ajouter quelques catégories (Burgers, Boissons) et des produits de test."

---

### Étape 2 : Le Backend Rust pour l'impression
Avant de faire une belle interface, il faut s'assurer que la communication avec le hardware fonctionne.

> **Prompt à copier :**
> "Crée une commande Rust dans Tauri (`src-tauri/src/lib.rs`) nommée `print_to_kitchen`. Cette commande doit prendre une IP d'imprimante et une chaîne de caractères en argument. Elle doit ouvrir une connexion TCP sur le port 9100 et envoyer les données formatées en ESC/POS (inclure une commande de coupe de papier à la fin). Gère les erreurs si l'imprimante est hors-ligne."

---

### Étape 3 : La logique de création de commande (Server Actions / API)
C'est le pont entre ton interface et ta base de données.

> **Prompt à copier :**
> "Crée une action React 19 pour la création d'une commande. L'action doit : 
> 1. Valider les données avec Zod.
> 2. Créer l'entrée `Order` et les `OrderItems` dans PostgreSQL via Prisma (dans une transaction).
> 3. Si la création réussit, appeler la commande Tauri `print_to_kitchen` pour envoyer le ticket en cuisine. 
> 4. Retourner le numéro de commande généré."

---

### Étape 4 : L'interface de prise de commande (Le Frontend)
Maintenant qu'on peut enregistrer et imprimer, on crée l'outil pour le serveur.

> **Prompt à copier :**
> "Conçois l'interface de prise de commande 'Fast-Food'. Utilise une grille de boutons pour les produits, classée par catégories. Ajoute un panier latéral (Sidebar) qui récapitule la commande en cours. Utilise `useActionState` pour gérer la soumission de la commande et affiche un message de succès avec le numéro de commande une fois imprimée."

---

### Étape 5 : L'écran Caissier et Cuisine
Enfin, on crée les vues de suivi.

> **Prompt à copier :**
> "Crée deux nouvelles pages :
> 1. `/kitchen` : Affiche sous forme de cartes les commandes dont le statut est `PREPARING`. Ajoute un bouton 'Prêt' qui passe le statut en `READY`.
> 2. `/checkout` : Liste les commandes `PENDING`. Permet au caissier de sélectionner une commande, de choisir le mode de paiement (Espèces, Carte) et de marquer la commande comme `COMPLETED`."

---

### Mon conseil de "collègue dév" :
Ne lui demande pas de tout faire d'un coup. Valide chaque étape :
1. Vérifie que la base de données est bien créée avec `npx prisma studio`.
2. Teste l'impression avec un simple bouton avant de coder tout le tunnel de commande.
3. Utilise **TanStack Query** (React Query) pour l'écran cuisine afin qu'il se rafraîchisse automatiquement (polling) sans que le chef n'ait à cliquer sur "Actualiser".

Tu veux que je te détaille le code de la commande Rust pour l'impression ESC/POS tout de suite ?

=======================================================================================================

// datasource and generator
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// --- ENUMS ---

enum OrderStatus {
  PENDING    // En attente de paiement
  PREPARING  // En cuisine
  READY      // Prête au comptoir
  COMPLETED  // Payée et livrée
  CANCELLED  // Annulée
}

enum PaymentMethod {
  CASH
  CARD
  MOBILE_MONEY
}

// --- TABLES ---

model Category {
  id        String    @id @default(cuid())
  name      String    @unique
  products  Product[]
}

model Product {
  id          String      @id @default(cuid())
  name        String
  price       Decimal     @db.Decimal(10, 2)
  image       String?
  categoryId  String
  category    Category    @relation(fields: [categoryId], references: [id])
  orderItems  OrderItem[]
  isActive    Boolean     @default(true)
}

model Order {
  id            Int           @id @default(autoincrement())
  orderNumber   String        @unique // Numéro court pour le client (ex: #A12)
  status        OrderStatus   @default(PENDING)
  totalAmount   Decimal       @db.Decimal(10, 2)
  paymentMethod PaymentMethod?
  
  items         OrderItem[]
  
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([status])
}

model OrderItem {
  id        String   @id @default(cuid())
  orderId   Int
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  
  quantity  Int      @default(1)
  unitPrice Decimal  @db.Decimal(10, 2)
  notes     String?  // Ex: "Sans oignons", "Bien cuit"
  
  // Pour gérer les options complexes (ex: Sauce algérienne, Taille XL)
  customizations Json? 
}

============================================================================