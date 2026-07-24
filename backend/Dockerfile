# 1. Gunakan versi Node.js LTS
FROM node:20-alpine

# 2. Buat direktori kerja di dalam container
WORKDIR /app

# 3. Copy file package.json dan package-lock.json
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy seluruh sisa file kodingan ke container
COPY . .

# 6. Generate Prisma Client (jika pakai Prisma)
RUN npx prisma generate

# 7. Expose port (sesuaikan dengan port backend-mu, misal 8080 atau 3000)
EXPOSE 8080

# 8. Jalankan aplikasi
CMD ["node", "index.js"]