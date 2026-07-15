from sqlalchemy.orm import configure_mappers

from .user import (
    User,
    UserCreate,
    UserLogin,
)

from .offer import (
    Offer,
    ReadOffer,
    CreateOffer,
)

from .contact_method import (
    ContactMethod,
    ContactMethodCreate,
    ContactMethodUpdate,
    ContactMethodRead,
)
from .document import (
    Document,
    DocumentUpdate,
    DocumentRead,
)
from .contact import (
    Contact,
    ContactUpdate,
    ContactRead,
)
from .application import (
    Application,
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationRead,
)

# Toutes les classes sont maintenant importées et enregistrées.
# On reconstruit pour résoudre les références par chaîne :
#   - les tables (relations SQLAlchemy)
#   - les schémas Read imbriqués (Pydantic)
ContactMethod.model_rebuild()
Document.model_rebuild()
Contact.model_rebuild()
Application.model_rebuild()

ContactRead.model_rebuild()
ApplicationRead.model_rebuild()


configure_mappers()
