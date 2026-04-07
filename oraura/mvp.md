# Project Context: Fast-Food POS (Point of Sale) System de OR'AURA

## 1. Vision du Projet
Développement d'une application de bureau native pour la prise de commande en fast-food. L'objectif est la fluidité extrême : un serveur prend la commande sur tablette/PC, la valide, et l'information est routée instantanément vers l'imprimante cuisine (ticket de préparation) et l'écran du caissier (facturation/encaissement).

## 2. Stack Technique (Hard Requirements)
* **Framework Frontend :** React 19 (Utilisation des `Actions`, `useActionState`, et `Server Components` si applicable).
* **Runtime Desktop :** Tauri 2.0 (Interface en WebView, backend performant en Rust).
* **Langages :** TypeScript (Strict mode) & Rust.
* **Gestion d'état :** TanStack Query (React Query) pour le cache et la synchro.
* **Base de Données :** PostgreSQL avec Prisma ORM.
* **Stylisation & UI :** Tailwind CSS + shadcn/ui (Composants accessibles et optimisés tactile).
* **Gestion de Paquets :** pnpm.
* **OS Cible :** Windows 11 & Ubuntu.

## 3. Architecture & Flux de Données
1.  **Saisie :** Interface tactile optimisée (grille de produits, catégories).
2.  **Validation :** Envoi de la commande via une API (ou Server Action).
3.  **Impression Cuisine :** Tauri invoque une commande Rust (`command`) qui communique en direct via TCP/IP (port 9100) avec l'imprimante thermique en protocole **ESC/POS**.
4.  **Notification Caissier :** Mise à jour en temps réel de la liste des commandes "À payer" (via Polling court ou WebSocket).

## 4. Schéma de Données (Prisma)
Le schéma repose sur les entités suivantes :
* `Category` / `Product` : Catalogue menu.
* `Order` : Entête de commande (Numéro court, Statut, Total).
* `OrderItem` : Ligne de commande avec **instantané du prix** (unitPrice) et champ JSON `customizations` pour les variantes (sauces, suppléments).
* `Enums` : `OrderStatus` (PENDING, PREPARING, READY, COMPLETED, CANCELLED).

## 5. Fonctionnalités Clés
* **Prise de commande rapide :** Sélection de produits, ajout de notes ("Sans oignons"), gestion des quantités.
* **Double Impression Différenciée :**
    * *Cuisine :* Ticket compact (Produits + Notes uniquement).
    * *Client :* Ticket légal (Détails prix, TVA, Total, Mode de paiement).
* **Dashboard Caissier :** Gestion des paiements (Espèces, Carte, Mobile Money) et clôture de commande.
* **Mode "Cuisine" (KDS) :** Affichage des commandes en cours avec bouton "Prêt".
* **Gestion de catalogue :** Interface CRUD pour modifier les produits et prix.

## 6. Optimisations & Règles de Gestion
* **Offline Resilience :** L'application doit permettre la saisie même en cas de micro-coupures réseau (Optimistic UI).
* **Immuabilité des prix :** Le prix d'une ligne de commande (`OrderItem`) ne doit jamais changer même si le prix du `Product` est modifié ultérieurement.
* **Performance Impression :** Pas de génération de PDF. Envoi de buffers de bytes bruts (ESC/POS) pour une impression instantanée sans boîte de dialogue système.
* **Numérotation :** `orderNumber` doit être un identifiant court (ex: A01, A02) lisible pour le client.

## 7. Sécurisation
* **Isolation Réseau :** Communication limitée au réseau local (LAN) pour les imprimantes.
* **Validation Zod :** Validation stricte de tous les inputs côté client et serveur.
* **Rust Backend :** Utilisation des capacités de Tauri pour empêcher l'exécution de code arbitraire et restreindre les scopes système (accès réseau limité aux IPs des imprimantes).

## 8. Instructions pour l'IA
* Générer du code **TypeScript idiomatique** et des composants **React 19** utilisant les hooks modernes.
* Prioriser la **réutilisabilité** des composants (Atomic Design).
* Pour toute logique hardware, proposer des fonctions **Rust** robustes avec gestion d'erreurs claire (`Result`).
* Suivre les principes de **Clean Code** : fonctions courtes, typage fort, et commentaires explicites sur la logique métier complexe.