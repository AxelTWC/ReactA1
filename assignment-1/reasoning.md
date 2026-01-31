## Q1: Before coding, what did you think would be the hardest part?

Before coding , I think the hardest part is to get started from the template as there are different files which correspond to different parts of the site to allow it to function. It took me a while to figure out why just editing the route showed nothing ( until I realized that I need to setup middleware.js and database.js ) 
 
## Q2: Did you use AI?

Yes: Files affected with AI - route.js
 - Major use : Debugging assistance
 Listed usage below Q3.

## Q3: (Only if you used AI) Choose one AI-generated output and explain what you changed and why.

In route.js - I did not add Validation Error for 

```return res.status(400).json({ error: "Validation Error", messages: errors });```

Used AI to check why it was failing for a1.sample.test.js , since I only had ```return res.status(400).json({ errors });```

