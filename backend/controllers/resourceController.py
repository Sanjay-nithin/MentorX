import os
import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Header
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import cloudinary
import cloudinary.uploader
from database import db
from utils.auth import verify_access_token
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(tags=["Resources"])

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)


def _read_json(file_path: str) -> dict:
    """Read JSON file safely."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Quiz session file not found: {file_path}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in quiz session file")


def generate_quiz_notes_pdf(quiz_data: dict, results_data: dict) -> BytesIO:
    """
    Generate a comprehensive PDF notes document from quiz results.
    
    Args:
        quiz_data: The quiz session data from tmp file
        results_data: The analyzed results from /finish endpoint
        
    Returns:
        BytesIO: PDF file in memory
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=12,
        spaceBefore=20,
        fontName='Helvetica-Bold'
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Heading3'],
        fontSize=14,
        textColor=colors.HexColor('#3b82f6'),
        spaceAfter=10,
        spaceBefore=15,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        leading=16,
        alignment=TA_JUSTIFY,
        spaceAfter=10
    )
    
    # Add MentorX Logo (if exists)
    logo_path = os.path.join(os.path.dirname(__file__), '..', 'assets', 'mentorx_logo.png')
    if os.path.exists(logo_path):
        try:
            logo = Image(logo_path, width=2*inch, height=0.6*inch)
            logo.hAlign = 'CENTER'
            story.append(logo)
            story.append(Spacer(1, 0.2*inch))
        except Exception as e:
            print(f"Could not load logo: {e}")
    
    # Title Page
    topic = quiz_data.get('topic', 'Quiz Results')
    story.append(Paragraph(f"Quiz Notes: {topic}", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Metadata
    attempt_id = quiz_data.get('attempt_id', 'N/A')
    created_at = quiz_data.get('created_at', 'N/A')
    story.append(Paragraph(f"<b>Attempt ID:</b> {attempt_id}", normal_style))
    story.append(Paragraph(f"<b>Date:</b> {created_at}", normal_style))
    story.append(Spacer(1, 0.4*inch))
    
    # Performance Summary
    story.append(Paragraph("Performance Summary", heading_style))
    
    total = results_data.get('total_questions', 0)
    correct = results_data.get('correct_answers', 0)
    wrong = results_data.get('wrong_answers', 0)
    score = results_data.get('final_score_10', 0)
    percentage = results_data.get('score_percentage', 0)
    
    summary_data = [
        ['Metric', 'Value'],
        ['Total Questions', str(total)],
        ['Correct Answers', str(correct)],
        ['Wrong Answers', str(wrong)],
        ['Score Percentage', f"{percentage:.1f}%"],
        ['Final Score (out of 10)', f"{score:.1f}"]
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))
    
    story.append(summary_table)
    story.append(Spacer(1, 0.3*inch))
    
    # AI Analysis
    if results_data.get('honest_feedback'):
        story.append(Paragraph("AI Performance Analysis", heading_style))
        story.append(Paragraph(results_data['honest_feedback'], normal_style))
        story.append(Spacer(1, 0.2*inch))
    
    # Learning Profile
    learning_profile = results_data.get('learning_profile', {})
    if learning_profile:
        story.append(Paragraph("Learning Profile", heading_style))
        
        if learning_profile.get('learning_pattern'):
            story.append(Paragraph("<b>Learning Pattern:</b>", subheading_style))
            story.append(Paragraph(learning_profile['learning_pattern'], normal_style))
        
        if learning_profile.get('strengths'):
            story.append(Paragraph("<b>Strengths:</b>", subheading_style))
            for strength in learning_profile['strengths']:
                story.append(Paragraph(f"• {strength}", normal_style))
        
        if learning_profile.get('weaknesses'):
            story.append(Paragraph("<b>Areas for Improvement:</b>", subheading_style))
            for weakness in learning_profile['weaknesses']:
                story.append(Paragraph(f"• {weakness}", normal_style))
        
        if learning_profile.get('hidden_weak_concepts'):
            story.append(Paragraph("<b>Hidden Knowledge Gaps:</b>", subheading_style))
            story.append(Paragraph(
                f"Potential weaknesses detected in: {', '.join(learning_profile['hidden_weak_concepts'])}",
                normal_style
            ))
        
        if learning_profile.get('focus_areas'):
            story.append(Paragraph("<b>Priority Focus Areas:</b>", subheading_style))
            for area in learning_profile['focus_areas']:
                story.append(Paragraph(f"• {area}", normal_style))
    
    story.append(Spacer(1, 0.2*inch))
    
    # Roadmap
    if results_data.get('roadmap'):
        story.append(Paragraph("Recommended Learning Path", heading_style))
        for i, step in enumerate(results_data['roadmap'], 1):
            story.append(Paragraph(f"<b>Step {i}:</b> {step}", normal_style))
    
    story.append(Spacer(1, 0.2*inch))
    
    # Next Topic Suggestion
    next_topic = results_data.get('next_topic_suggestion', {})
    if next_topic and next_topic.get('topic'):
        story.append(Paragraph("Next Recommended Topic", heading_style))
        story.append(Paragraph(f"<b>{next_topic['topic']}</b>", subheading_style))
        if next_topic.get('reason'):
            story.append(Paragraph(next_topic['reason'], normal_style))
    
    # Page Break before mistakes
    story.append(PageBreak())
    
    # Mistakes Detail
    mistakes = results_data.get('mistakes_detail', [])
    if mistakes:
        story.append(Paragraph("Detailed Mistake Analysis", heading_style))
        story.append(Paragraph(
            f"Review and learn from your {len(mistakes)} mistake(s) below:",
            normal_style
        ))
        story.append(Spacer(1, 0.2*inch))
        
        for i, mistake in enumerate(mistakes, 1):
            story.append(Paragraph(f"<b>Mistake #{i}</b>", subheading_style))
            
            # Question
            story.append(Paragraph(f"<b>Question:</b> {mistake.get('question', 'N/A')}", normal_style))
            
            # Create a table for answers
            answer_data = [
                ['Your Answer', mistake.get('user_answer', 'N/A')],
                ['Correct Answer', mistake.get('correct_answer', 'N/A')]
            ]
            
            answer_table = Table(answer_data, colWidths=[1.5*inch, 4.5*inch])
            answer_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#fee2e2')),
                ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#fecaca')),
                ('BACKGROUND', (1, 1), (1, 1), colors.HexColor('#bbf7d0')),
                ('TEXTCOLOR', (0, 0), (0, 0), colors.HexColor('#991b1b')),
                ('TEXTCOLOR', (1, 0), (1, 0), colors.HexColor('#991b1b')),
                ('TEXTCOLOR', (0, 1), (0, 1), colors.HexColor('#166534')),
                ('TEXTCOLOR', (1, 1), (1, 1), colors.HexColor('#166534')),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6)
            ]))
            
            story.append(answer_table)
            story.append(Spacer(1, 0.1*inch))
            
            # Explanation
            explanation = mistake.get('reason', 'No explanation available.')
            story.append(Paragraph(f"<b>Explanation:</b>", normal_style))
            story.append(Paragraph(explanation, normal_style))
            story.append(Spacer(1, 0.2*inch))
    
    # Footer
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(
        "Generated by MentorX AI Learning Platform",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.grey, alignment=TA_CENTER)
    ))
    story.append(Paragraph(
        f"Report Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        ParagraphStyle('Footer2', parent=styles['Normal'], fontSize=9, textColor=colors.grey, alignment=TA_CENTER)
    ))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer


def upload_pdf_to_cloudinary(pdf_buffer: BytesIO, topic: str, user_id: str) -> dict:
    """
    Upload PDF to Cloudinary.
    
    Args:
        pdf_buffer: PDF file in memory
        topic: Topic name for the file
        user_id: User ID for folder organization
        
    Returns:
        dict: Upload response with URL
    """
    try:
        # Create a safe filename
        safe_topic = topic.lower().replace(' ', '-').replace('/', '-')[:50]
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{safe_topic}_{timestamp}"
        
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            pdf_buffer,
            folder=f"mentorx/resources/{user_id}",
            public_id=filename,
            resource_type="raw",
            format="pdf",
            tags=["quiz-notes", topic, user_id]
        )
        
        return upload_result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload PDF to Cloudinary: {str(e)}"
        )


async def save_resource_to_db(user_id: str, topic: str, resource_url: str, metadata: dict):
    """
    Save resource link to user's resources in MongoDB.
    
    Args:
        user_id: User's MongoDB ObjectId
        topic: Topic name
        resource_url: Cloudinary URL of the PDF
        metadata: Additional metadata (file size, format, etc.)
    """
    try:
        users_collection = db["users"]
        
        resource_entry = {
            "resource_id": str(uuid.uuid4()),  # Unique ID for deletion
            "topic": topic,
            "resource_url": resource_url,
            "resource_type": "quiz_notes_pdf",
            "created_at": datetime.utcnow(),
            "metadata": metadata
        }
        
        # Add to user's resources array
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$push": {
                    "resources": resource_entry
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=404,
                detail="User not found or resources not updated"
            )
        
        return resource_entry
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save resource to database: {str(e)}"
        )


@router.post('/generate-notes')
async def generate_quiz_notes(
    payload: dict,
    authorization: str | None = Header(default=None)
):
    """
    Generate PDF notes from a completed quiz session and upload to Cloudinary.
    
    Request body:
    {
        "session_file_path": "backend/tmp/quiz_[uuid].json",
        "results_data": { ...results from /finish endpoint... }
    }
    
    Returns:
    {
        "success": true,
        "resource_url": "https://res.cloudinary.com/...",
        "topic": "Python Variables",
        "message": "Notes generated and saved successfully"
    }
    """
    # Verify authentication
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.split(" ", 1)[1].strip()
    try:
        token_data = verify_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Extract payload
    session_file_path = payload.get('session_file_path')
    results_data = payload.get('results_data')
    
    if not session_file_path:
        raise HTTPException(
            status_code=400,
            detail="session_file_path is required"
        )
    
    if not results_data:
        raise HTTPException(
            status_code=400,
            detail="results_data is required"
        )
    
    # Read quiz session data
    quiz_data = _read_json(session_file_path)
    topic = quiz_data.get('topic', 'Quiz Results')
    
    try:
        # Generate PDF
        print(f"Generating PDF notes for topic: {topic}")
        pdf_buffer = generate_quiz_notes_pdf(quiz_data, results_data)
        
        # Upload to Cloudinary
        print("Uploading PDF to Cloudinary...")
        upload_result = upload_pdf_to_cloudinary(pdf_buffer, topic, user_id)
        
        resource_url = upload_result.get('secure_url')
        file_size = upload_result.get('bytes', 0)
        public_id = upload_result.get('public_id')
        
        # Save to database
        print("Saving resource link to database...")
        metadata = {
            "file_size": file_size,
            "format": "pdf",
            "cloudinary_public_id": public_id,
            "pages": results_data.get('total_questions', 0) + 5  # Approximate
        }
        
        await save_resource_to_db(user_id, topic, resource_url, metadata)
        
        return {
            "success": True,
            "resource_url": resource_url,
            "topic": topic,
            "file_size": file_size,
            "public_id": public_id,
            "message": "Notes generated and saved successfully"
        }
        
    except Exception as e:
        print(f"Error generating notes: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate notes: {str(e)}"
        )


@router.get('/my-resources')
async def get_user_resources(
    authorization: str | None = Header(default=None)
):
    """
    Get all resources for the authenticated user.
    
    Returns:
    {
        "resources": [
            {
                "topic": "Python Variables",
                "resource_url": "https://...",
                "resource_type": "quiz_notes_pdf",
                "created_at": "2025-12-07T...",
                "metadata": {...}
            }
        ]
    }
    """
    # Verify authentication
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.split(" ", 1)[1].strip()
    try:
        token_data = verify_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Get user's resources
    try:
        users_collection = db["users"]
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        resources = user.get('resources', [])
        
        return {
            "resources": resources,
            "total": len(resources)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch resources: {str(e)}"
        )


@router.delete('/{resource_id}')
async def delete_resource(
    resource_id: str,
    authorization: str | None = Header(default=None)
):
    """
    Delete a resource from Cloudinary and MongoDB.
    
    Args:
        resource_id: The unique resource ID
    
    Returns:
    {
        "success": true,
        "message": "Resource deleted successfully"
    }
    """
    # Verify authentication
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.split(" ", 1)[1].strip()
    try:
        token_data = verify_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Find and delete resource
    try:
        users_collection = db["users"]
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        resources = user.get('resources', [])
        resource_to_delete = None
        
        # Find the resource
        for res in resources:
            if res.get('resource_id') == resource_id:
                resource_to_delete = res
                break
        
        if not resource_to_delete:
            raise HTTPException(
                status_code=404,
                detail="Resource not found"
            )
        
        # Delete from Cloudinary
        cloudinary_public_id = resource_to_delete.get('metadata', {}).get('cloudinary_public_id')
        if cloudinary_public_id:
            try:
                cloudinary.uploader.destroy(cloudinary_public_id, resource_type="raw")
                print(f"Deleted from Cloudinary: {cloudinary_public_id}")
            except Exception as e:
                print(f"Failed to delete from Cloudinary: {e}")
                # Continue with DB deletion even if Cloudinary fails
        
        # Remove from MongoDB
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$pull": {
                    "resources": {"resource_id": resource_id}
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=500,
                detail="Failed to delete resource from database"
            )
        
        return {
            "success": True,
            "message": "Resource deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete resource: {str(e)}"
        )
