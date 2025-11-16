import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  calculateIntakeCompletion, 
  getAllUserTypeCompletions,
  getUserTypeFromRole,
  getCompletionColor,
  getCompletionStatus,
  UserType,
  INTAKE_SECTIONS
} from '../utils/intakeCompletion';

interface IntakeCompletionWidgetProps {
  patientData: any;
  userRole?: string;
  showAllTypes?: boolean;
  compact?: boolean;
}

export function IntakeCompletionWidget({ 
  patientData, 
  userRole, 
  showAllTypes = false,
  compact = false 
}: IntakeCompletionWidgetProps) {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';

  if (showAllTypes) {
    const allCompletions = getAllUserTypeCompletions(patientData);
    
    return (
      <div className="intake-completion-all" style={{ 
        display: 'grid', 
        gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {Object.entries(allCompletions).map(([userType, completion]) => (
          <CompletionCard 
            key={userType}
            userType={userType as UserType}
            completion={completion}
            compact={compact}
            isHebrew={isHebrew}
          />
        ))}
      </div>
    );
  }

  const currentUserType = getUserTypeFromRole(userRole || 'general');
  const completion = calculateIntakeCompletion(patientData, currentUserType);

  return (
    <CompletionCard 
      userType={currentUserType}
      completion={completion}
      compact={compact}
      isHebrew={isHebrew}
      showSections={!compact}
    />
  );
}

interface CompletionCardProps {
  userType: UserType;
  completion: any;
  compact: boolean;
  isHebrew: boolean;
  showSections?: boolean;
}

function CompletionCard({ userType, completion, compact, isHebrew, showSections = false }: CompletionCardProps) {
  const getUserTypeLabel = (type: UserType) => {
    if (isHebrew) {
      switch (type) {
        case 'social_worker': return 'עבודה סוציאלית';
        case 'career_counselor': return 'הכוונה מקצועית';
        case 'emotional_therapist': return 'טיפול רגשי';
        case 'general': return 'כללי';
        default: return 'כללי';
      }
    } else {
      switch (type) {
        case 'social_worker': return 'Social Work';
        case 'career_counselor': return 'Career Guidance';
        case 'emotional_therapist': return 'Emotional Therapy';
        case 'general': return 'General';
        default: return 'General';
      }
    }
  };

  const completionColor = getCompletionColor(completion.overall);
  const completionStatus = getCompletionStatus(completion.overall, isHebrew ? 'he' : 'en');

  return (
    <div 
      className="completion-card"
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: compact ? '12px' : '16px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: compact ? '8px' : '12px'
      }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: compact ? '14px' : '16px',
          fontWeight: 600,
          color: '#333'
        }}>
          {getUserTypeLabel(userType)}
        </h4>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            fontSize: compact ? '12px' : '14px',
            color: completionColor,
            fontWeight: 600
          }}>
            {completion.overall}%
          </span>
          {!compact && (
            <span style={{
              fontSize: '12px',
              color: '#666',
              backgroundColor: '#f8f9fa',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {completionStatus}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: compact ? '6px' : '8px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: compact ? '8px' : '12px'
      }}>
        <div style={{
          width: `${completion.overall}%`,
          height: '100%',
          backgroundColor: completionColor,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Fields Summary */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: compact ? '11px' : '12px',
        color: '#666'
      }}>
        <span>
          {isHebrew ? 'שדות שהושלמו' : 'Fields Completed'}: {completion.completedFields}/{completion.totalFields}
        </span>
        {completion.requiredSectionsComplete ? (
          <span style={{ color: '#28a745' }}>
            ✓ {isHebrew ? 'חובה הושלמה' : 'Required Complete'}
          </span>
        ) : (
          <span style={{ color: '#dc3545' }}>
            ! {isHebrew ? 'חובה חסרה' : 'Required Missing'}
          </span>
        )}
      </div>

      {/* Section Breakdown */}
      {showSections && !compact && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: '#333',
            marginBottom: '8px'
          }}>
            {isHebrew ? 'פירוט לפי סעיפים:' : 'Section Breakdown:'}
          </div>
          {Object.entries(completion.sections).map(([sectionName, sectionData]: [string, any]) => {
            const section = INTAKE_SECTIONS.find(s => s.name === sectionName);
            const sectionLabel = section ? (isHebrew ? section.nameHe : section.name) : sectionName;
            
            return (
              <div key={sectionName} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                marginBottom: '4px',
                padding: '4px 0'
              }}>
                <span style={{ 
                  color: '#555',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {sectionData.required && <span style={{ color: '#dc3545' }}>*</span>}
                  {sectionLabel}
                </span>
                <span style={{ 
                  color: getCompletionColor(sectionData.percentage),
                  fontWeight: 600
                }}>
                  {sectionData.completed}/{sectionData.total} ({sectionData.percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default IntakeCompletionWidget;
