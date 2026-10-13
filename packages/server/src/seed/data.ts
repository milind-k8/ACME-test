// Fixed lists the seed draws from. Changing them changes the seeded data, so the seed tests pin their shape, not values.

// Names are typical for each country, including accented ones so search can be tested against them. 40 first and 40
// last names per country give 1,600 combinations for ~1,250 people, so namesakes are occasional, as in a real company;
// the employee number tells them apart.
// payMultiplier: local currency (major units) paid per USD of a job's base salary. It folds in both cost of
// living and the exchange rate, so the generator stays pure and needs no FX lookup.
const words = (list: string) => list.split(" ");

export const SEED_COUNTRIES = [
  {
    code: "US",
    currency: "USD",
    payMultiplier: 1,
    firstNames: words(
      "James Mary Michael Jennifer David Linda Robert Emily Daniel Ashley William Sarah Christopher Jessica Matthew Amanda Joshua Megan Andrew Lauren Ryan Rachel Brandon Samantha Tyler Nicole Justin Hannah Kevin Brittany Jacob Kayla Austin Madison Ethan Abigail Nathan Olivia Aaron Taylor",
    ),
    lastNames: words(
      "Smith Johnson Williams Brown Jones Miller Davis Wilson Anderson Taylor Thomas Moore Jackson White Harris Martin Thompson Robinson Clark Lewis Walker Hall Allen Young King Wright Scott Green Baker Adams Nelson Hill Campbell Mitchell Roberts Carter Phillips Evans Turner Parker",
    ),
  },
  {
    code: "CA",
    currency: "CAD",
    payMultiplier: 1.1,
    firstNames: words(
      "Liam Olivia Noah Chloé Ethan Charlotte Lucas Zoë Benjamin Maëlle Jacob Emma William Léa Logan Amélia Nathan Juliette Samuel Gabrielle Félix Rosalie Mathis Florence Thomas Alice Owen Camille Hunter Évelyne Connor Mégane Dylan Avery Jérôme Brooke Étienne Madeleine Raphaël Stéphanie",
    ),
    lastNames: words(
      "Tremblay Gagnon Roy Côté Bouchard Martin Lee Wilson MacDonald Campbell Gauthier Morin Lavoie Fortin Gagné Ouellet Pelletier Bélanger Lévesque Bergeron Leblanc Paquette Girard Simard Boucher Caron Beaulieu Cloutier Dubé Poirier Fraser Murray Stewart Grant Robertson Ross Thompson Chen Singh Wong",
    ),
  },
  {
    code: "GB",
    currency: "GBP",
    payMultiplier: 0.62,
    firstNames: words(
      "Oliver Amelia George Isla Harry Ava Jack Grace Thomas Sophie Oscar Emily Charlie Poppy Jacob Freya Alfie Evie Henry Ella Leo Lily Archie Florence Joshua Ruby Freddie Daisy Theo Matilda Arthur Phoebe Edward Imogen Alexander Harriet Rory Eleanor Callum Rosie",
    ),
    lastNames: words(
      "Smith Jones Taylor Brown Evans Walker Wright Thompson Hughes Roberts Wilson Davies Robinson Wood Edwards Green Hall Lewis Harris Clarke Patel Jackson Turner Hill Moore Cooper Ward Morris King Watson Harrison Morgan Baker Young Allen Mitchell Bell Kelly Cook Bailey",
    ),
  },
  {
    code: "DE",
    currency: "EUR",
    payMultiplier: 0.7,
    firstNames: words(
      "Lukas Mia Jonas Emma Felix Hannah Leon Lena Paul Jürgen Maximilian Sophie Elias Lea Finn Marie Noah Anna Ben Laura Tim Johanna Jan Katharina Niklas Julia Moritz Sarah Tobias Lisa Sebastian Franziska Florian Annika Matthias Jana Stefan Lara Björn Jörg",
    ),
    lastNames: words(
      "Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Schäfer Koch Bauer Richter Klein Wolf Schröder Neumann Schwarz Zimmermann Braun Krüger Hofmann Hartmann Lange Schmitt Werner Schmitz Krause Meier Lehmann Schmid Schulze Maier Köhler Herrmann König Walter Mayer Huber",
    ),
  },
  {
    code: "ES",
    currency: "EUR",
    payMultiplier: 0.5,
    firstNames: words(
      "José María Antonio Lucía Manuel Carmen Javier Sofía Álvaro Inés Francisco Ana David Laura Daniel Marta Carlos Paula Miguel Elena Pablo Cristina Alejandro Isabel Sergio Pilar Jorge Raquel Rubén Beatriz Adrián Nuria Iván Rocío Diego Andrea Óscar Silvia Hugo Mónica",
    ),
    lastNames: words(
      "García Fernández González Rodríguez López Martínez Sánchez Pérez Gómez Ruiz Martín Jiménez Hernández Díaz Moreno Muñoz Álvarez Romero Alonso Gutiérrez Navarro Torres Domínguez Vázquez Ramos Gil Ramírez Serrano Blanco Molina Morales Suárez Ortega Delgado Castro Ortiz Rubio Marín Sanz Núñez",
    ),
  },
  {
    code: "IN",
    currency: "INR",
    payMultiplier: 25,
    firstNames: words(
      "Krishna Priya Arjun Ananya Rahul Kavya Vikram Divya Rohan Sneha Aarav Isha Aditya Pooja Siddharth Neha Karan Meera Varun Shreya Nikhil Riya Amit Anjali Suresh Lakshmi Rajesh Deepika Manoj Swati Harish Nandini Gaurav Aishwarya Pranav Tanvi Abhishek Kiran Sanjay Pallavi",
    ),
    lastNames: words(
      "Sharma Patel Singh Kumar Gupta Reddy Iyer Nair Mehta Joshi Rao Verma Desai Shah Chopra Malhotra Kapoor Agarwal Banerjee Chatterjee Mukherjee Das Bose Pillai Menon Kulkarni Deshpande Patil Jain Saxena Bhat Naidu Chauhan Yadav Mishra Pandey Tiwari Srinivasan Krishnan Ghosh",
    ),
  },
  {
    code: "JP",
    currency: "JPY",
    payMultiplier: 110,
    firstNames: words(
      "Haruto Yui Sota Hina Yuto Aoi Ren Sakura Kaito Mei Riku Yuna Hiroshi Akari Takumi Rin Daiki Saki Kenta Misaki Shota Nanami Yusuke Haruka Kazuki Mio Ryo Ayaka Naoki Emi Tatsuya Yuki Kenji Asuka Takeshi Natsuki Shun Kaede Koji Honoka",
    ),
    lastNames: words(
      "Sato Suzuki Takahashi Tanaka Watanabe Ito Yamamoto Nakamura Kobayashi Kato Yoshida Yamada Sasaki Yamaguchi Matsumoto Inoue Kimura Hayashi Shimizu Yamazaki Mori Abe Ikeda Hashimoto Yamashita Ishikawa Nakajima Maeda Fujita Ogawa Goto Okada Hasegawa Murakami Kondo Ishii Saito Sakamoto Endo Aoki",
    ),
  },
  {
    code: "BR",
    currency: "BRL",
    payMultiplier: 1.6,
    firstNames: words(
      "João Ana Pedro Júlia Gabriel Beatriz Lucas Larissa Matheus Camila Rafael Mariana Gustavo Letícia Felipe Fernanda Bruno Amanda Thiago Gabriela Rodrigo Bruna Leonardo Isabela Vinícius Carolina Diego Natália André Patrícia Eduardo Luana Marcelo Vitória Caio Raquel Henrique Débora Otávio Priscila",
    ),
    lastNames: words(
      "Silva Santos Oliveira Souza Rodrigues Ferreira Alves Pereira Lima Gonçalves Gomes Ribeiro Carvalho Almeida Lopes Soares Fernandes Vieira Barbosa Rocha Dias Nascimento Andrade Moreira Nunes Marques Machado Mendes Freitas Cardoso Ramos Teixeira Araújo Correia Cavalcanti Monteiro Moura Batista Campos Pinto",
    ),
  },
] as const;

export const SEED_JOBS = [
  { title: "Software Engineer", department: "Engineering", baseUsd: 120_000 },
  {
    title: "Senior Software Engineer",
    department: "Engineering",
    baseUsd: 160_000,
  },
  { title: "Engineering Manager", department: "Engineering", baseUsd: 190_000 },
  { title: "QA Engineer", department: "Engineering", baseUsd: 95_000 },
  { title: "DevOps Engineer", department: "Engineering", baseUsd: 135_000 },
  { title: "Data Analyst", department: "Data", baseUsd: 85_000 },
  { title: "Data Scientist", department: "Data", baseUsd: 140_000 },
  { title: "Product Manager", department: "Product", baseUsd: 145_000 },
  { title: "Product Designer", department: "Product", baseUsd: 115_000 },
  { title: "Account Executive", department: "Sales", baseUsd: 90_000 },
  { title: "Sales Manager", department: "Sales", baseUsd: 130_000 },
  { title: "Sales Development Rep", department: "Sales", baseUsd: 60_000 },
  { title: "Marketing Specialist", department: "Marketing", baseUsd: 75_000 },
  { title: "Marketing Manager", department: "Marketing", baseUsd: 120_000 },
  { title: "Accountant", department: "Finance", baseUsd: 80_000 },
  { title: "Financial Analyst", department: "Finance", baseUsd: 95_000 },
  { title: "HR Generalist", department: "People", baseUsd: 70_000 },
  { title: "Recruiter", department: "People", baseUsd: 75_000 },
  { title: "Customer Support Agent", department: "Support", baseUsd: 50_000 },
  { title: "Support Team Lead", department: "Support", baseUsd: 75_000 },
] as const;
