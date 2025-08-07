from langchain_community.document_loaders import UnstructuredPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader
from langchain_core.prompts import ChatPromptTemplate
from youtube_transcript_api import YouTubeTranscriptApi
from . import llm_provider


llm = llm_provider.get_llm(agent='summarizer', temperature=1.0)


def fetch_and_summarize_url(url: str) -> str:
    loader = WebBaseLoader(url)
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    docs = text_splitter.split_documents(documents)

    full_text = "\n\n".join(doc.page_content for doc in docs)

    prompt = ChatPromptTemplate.from_template("Summarize the following:\n\n{input}")
    chain = prompt | llm

    result = chain.invoke({"input": full_text})
    return result.content if hasattr(result, "content") else str(result)


def fetch_and_summarize_pdf(file_path: str = None, url: str = None) -> str:
    if url:
        import requests
        import tempfile
        response = requests.get(url)
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        temp_file.write(response.content)
        temp_file.close()
        file_path = temp_file.name

    loader = UnstructuredPDFLoader(file_path)
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    docs = text_splitter.split_documents(documents)

    # Prepare the full text
    full_text = "\n\n".join(doc.page_content for doc in docs)

    prompt = ChatPromptTemplate.from_template("Summarize the following:\n\n{input}")
    chain = prompt | llm

    result = chain.invoke({"input": full_text})
    return result.content if hasattr(result, "content") else str(result)


def summarize_youtube_video(url: str) -> str:
    try:
        # Extract video ID from URL
        if "watch?v=" in url:
            video_id = url.split("watch?v=")[-1].split("&")[0]
        elif "youtu.be/" in url:
            video_id = url.split("youtu.be/")[-1].split("?")[0]
        else:
            return "❌ Invalid YouTube URL format."

        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.list(video_id)

        try:
            # Try to find an English transcript first
            transcript = transcript_list.find_transcript(["en"])
        except Exception:
            # If English not found, fallback to first available transcript
            transcript = next(iter(transcript_list))

        # Fetch the transcript content
        fetched = transcript.fetch()
        transcript_text = "\n".join([snippet.text for snippet in fetched])

        # Split the transcript into manageable chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.create_documents([transcript_text])
        full_text = "\n\n".join(chunk.page_content for chunk in chunks)

        # Use the LLM to summarize
        prompt = ChatPromptTemplate.from_template("Summarize the following YouTube transcript:\n\n{input}")
        chain = prompt | llm
        result = chain.invoke({"input": full_text})

        return result.content if hasattr(result, "content") else str(result)

    except Exception as e:
        return f"❌ Error summarizing video: {str(e)}"


def run_tool_server_side(tool_name: str, args: dict) -> str:
    if tool_name == "fetch_url":
        return fetch_and_summarize_url(args["url"])

    if tool_name == "read_pdf":
        return fetch_and_summarize_pdf(args.get("file_path"), args.get("url"))

    if tool_name == "summarize_youtube_video":
        return summarize_youtube_video(args["url"])

    raise ValueError(f"Unsupported tool: {tool_name}")