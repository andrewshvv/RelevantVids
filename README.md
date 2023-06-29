# RelevantVids

This Chrome extension is a lighthouse amidst the whirlpool of YouTube distractions, guiding your learning journey with precision and ease. When using YouTube for educational purposes, it's easy to get swept up in the sea of unrelated videos that constantly vie for your attention. This extension is an adept solution to this common dilemma.

Just set your desired learning theme in the extension, and watch as your YouTube page transforms from an overwhelming medley of content into a curated gallery aligned with your interests. It sifts through video titles, highlights the ones relevant to your set theme, and reduces the noise from irrelevant, off-topic content.

You have the freedom to change themes as your interests evolve, keeping your learning journey fresh and focused. Need a regular browsing break? Clear the theme to revert back to the standard YouTube view. In essence, this tool allows you to cut through the distraction, paving a more focused path for your YouTube learning experience.

### A bit more technical description
This Chrome extension works by manipulating the YouTube webpage's HTML based on the user's specified theme, using JavaScript and Chrome's APIs. It leverages advanced language understanding capabilities of OpenAI's powerful GPT model for this purpose.

When a theme is set by the user via the extension, an event is triggered that retrieves this theme from Chrome's local storage. The extension then seeks out the video grid containers on the YouTube page and starts monitoring them using a MutationObserver instance.

The MutationObserver watches for changes or additions to the video grid, such as the appearance of new videos. Whenever such a change is detected, the extension examines the newly added video elements and checks their relevancy against the user-specified theme.

For each new video, it extracts the title and sends it along with the user's specified theme as a request to OpenAI's GPT API. This remote server runs a language-based model to determine whether the video title is relevant to the theme. Note that, to save computational resources and API calls, previously checked videos and their results are stored in a local Map.

Once the response from the API is received, based on the relevancy of the video to the theme, the extension applies CSS manipulation to highlight relevant videos and dims the irrelevant ones, thereby altering their visibility in the video grid.

Additionally, the extension maintains an "active state" for each page of YouTube, which allows it to update the curated view dynamically as the user navigates different sections of YouTube. If the user changes the theme, the entire video grid is updated to reflect the new theme. Users also have the option to reset the videos and revert back to the standard YouTube view.

1. `gpt.js`: This file contains functions necessary for asynchronous interaction with the GPT (Generative Pretrained Transformer) model from OpenAI. It helps send requests and handle responses concerning the relevance of YouTube video titles with the user's set theme.

2. `utils.js`: This is a utility file containing various helper functions. Functions in this file support interaction with the YouTube page's Document Object Model (DOM), including finding video grid containers, checking if a video is compatible with a chosen theme, making a video active or inactive, and re-arranging the video grid.

3. `content.js`: This is the main content script for the Chrome extension. It manages the extension's behavior when the DOM is loaded or changed and listens for changes in user specified theme. It also handles interactions with YouTube's video grid container and individual videos, checking their relevancy to the selected theme and altering their visibility accordingly. It fetches the results from the OpenAI GPT model by using functions imported from the `gpt.js` file.
