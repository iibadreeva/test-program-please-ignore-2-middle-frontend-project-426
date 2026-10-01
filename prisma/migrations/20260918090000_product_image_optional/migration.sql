-- AlterTable: a product may have no image, the client renders a placeholder instead
ALTER TABLE "Product" ALTER COLUMN "imageUrl" DROP NOT NULL;
